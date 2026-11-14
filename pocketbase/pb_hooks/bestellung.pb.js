/// <reference path="../pb_data/types.d.ts" />

// Fachregeln für Bestellrunde, Auftrag und Position (Spec #17, ADR 0002).

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
