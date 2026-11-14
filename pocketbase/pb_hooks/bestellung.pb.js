/// <reference path="../pb_data/types.d.ts" />

// Fachregeln für Bestellrunde, Auftrag, Position und Belegung (Spec #17,
// ADR 0002).

// Eine neue Bestellrunde ist offen, ein neuer Auftrag in Arbeit, auch wenn
// die App den Status nicht mitschickt.
onRecordCreateRequest((e) => {
  if (!e.record.getString('status')) e.record.set('status', 'offen')
  e.next()
}, 'bestellrunden')

onRecordCreateRequest((e) => {
  if (!e.record.getString('status')) e.record.set('status', 'in_arbeit')
  e.next()
}, 'auftraege')

// Es gibt höchstens eine offene Bestellrunde.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  if (e.record.getString('status') === 'offen') {
    const andere = e.app.findRecordsByFilter(
      'bestellrunden',
      "status = 'offen' && id != {:id}",
      '',
      1,
      0,
      { id: e.record.id },
    )
    if (andere.length > 0) {
      throw abgelehnt(
        'status',
        'schon_offen',
        'Es ist schon eine Bestellrunde offen.',
      )
    }
  }
  e.next()
}, 'bestellrunden')

// "Bin fertig" braucht mindestens eine Position, "Diesmal nichts" darf
// keine haben. So bleibt ein Verzicht von einem leeren Auftrag unterscheidbar.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  const status = e.record.getString('status')
  if (status === 'fertig' || status === 'verzicht') {
    const positionen = e.record.id
      ? e.app.findRecordsByFilter('positionen', 'auftrag = {:id}', '', 1, 0, {
          id: e.record.id,
        })
      : []
    if (status === 'fertig' && positionen.length === 0) {
      throw abgelehnt(
        'status',
        'fertig_ohne_positionen',
        'Ein Auftrag ohne Positionen lässt sich nicht abschicken.',
      )
    }
    if (status === 'verzicht' && positionen.length > 0) {
      throw abgelehnt(
        'status',
        'verzicht_mit_positionen',
        'Vor "Diesmal nichts" bitte erst alle Positionen entfernen.',
      )
    }
  }
  e.next()
}, 'auftraege')

// Die Größe gehört zum Artikel der Position.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  const groesseId = e.record.getString('groesse')
  if (groesseId) {
    let groesse = null
    try {
      groesse = e.app.findRecordById('groessen', groesseId)
    } catch {
      // Eine unbekannte Größe meldet die Relationsprüfung von PocketBase.
    }
    if (
      groesse &&
      groesse.getString('artikel') !== e.record.getString('artikel')
    ) {
      throw abgelehnt(
        'groesse',
        'groesse_fremd',
        'Diese Größe gibt es für den Artikel nicht.',
      )
    }
  }
  e.next()
}, 'positionen')

// "Bin fertig" erst, wenn an jeder Position alle Pflicht-Druckstellen belegt
// sind. Geprüft wird nur beim Wechsel auf fertig, damit eine später
// angelegte Pflicht-Druckstelle abgeschickte Aufträge nicht festhält.
// Ausgeblendete Druckstellen zählen nicht, sie lassen sich nicht mehr wählen.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  const wechselAufFertig =
    e.record.getString('status') === 'fertig' &&
    (e.record.isNew() || e.record.original().getString('status') !== 'fertig')
  if (wechselAufFertig && e.record.id) {
    const positionen = e.app.findRecordsByFilter(
      'positionen',
      'auftrag = {:id}',
      '',
      0,
      0,
      { id: e.record.id },
    )
    for (const position of positionen) {
      const offen = e.app.findRecordsByFilter(
        'druckstellen',
        'artikel = {:artikel} && pflicht = true && ausgeblendet = false',
        '',
        0,
        0,
        { artikel: position.getString('artikel') },
      )
      for (const druckstelle of offen) {
        const belegt = e.app.findRecordsByFilter(
          'belegungen',
          'position = {:position} && druckstelle = {:druckstelle}',
          '',
          1,
          0,
          { position: position.id, druckstelle: druckstelle.id },
        )
        if (belegt.length === 0) {
          throw abgelehnt(
            'status',
            'pflicht_druckstelle_leer',
            `Bitte erst alle Pflicht-Druckstellen belegen (${druckstelle.getString('name')}).`,
          )
        }
      }
    }
  }
  e.next()
}, 'auftraege')

// Die Druckstelle gehört zum Artikel der Position. Eine Motiv-Druckstelle
// bekommt ein erlaubtes Motiv und keinen Text, eine Text-Druckstelle Text und
// kein Motiv.
onRecordValidate((e) => {
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  let position = null
  let druckstelle = null
  try {
    position = e.app.findRecordById('positionen', e.record.getString('position'))
    druckstelle = e.app.findRecordById(
      'druckstellen',
      e.record.getString('druckstelle'),
    )
  } catch {
    // Fehlende Datensätze meldet die Relationsprüfung von PocketBase.
  }
  if (position && druckstelle) {
    if (druckstelle.getString('artikel') !== position.getString('artikel')) {
      throw abgelehnt(
        'druckstelle',
        'druckstelle_fremd',
        'Diese Druckstelle gibt es für den Artikel nicht.',
      )
    }
    const motiv = e.record.getString('motiv')
    const text = e.record.getString('text').trim()
    e.record.set('text', text)
    if (druckstelle.getString('art') === 'motiv') {
      if (text) {
        throw abgelehnt(
          'text',
          'text_an_motiv_druckstelle',
          'An dieser Druckstelle wird ein Motiv gewählt, kein Text.',
        )
      }
      if (!druckstelle.getStringSlice('erlaubte_motive').includes(motiv)) {
        throw abgelehnt(
          'motiv',
          'motiv_nicht_erlaubt',
          'Dieses Motiv ist an der Druckstelle nicht erlaubt.',
        )
      }
    } else {
      if (motiv) {
        throw abgelehnt(
          'motiv',
          'motiv_an_text_druckstelle',
          'An dieser Druckstelle wird Text eingetragen, kein Motiv.',
        )
      }
      if (!text) {
        throw abgelehnt(
          'text',
          'text_leer',
          'Bitte einen Text eintragen.',
        )
      }
    }
  }
  e.next()
}, 'belegungen')
