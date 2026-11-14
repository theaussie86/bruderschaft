/// <reference path="../pb_data/types.d.ts" />

// Abschließen und Wieder öffnen einer Bestellrunde (Spec #17, ADR 0002). Den
// Status einer Runde wechselt nur diese Hook-Route, transaktional, damit
// Festpreise, `mitbestellt` und Status immer zusammenpassen.

// Warnzahlen vor dem Abschließen: wie viele Aufträge nicht fertig sind.
routerAdd(
  'GET',
  '/api/club/bestellrunden/{id}/abschluss',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    const { nichtFertig, runde } = require(`${__hooks}/lib/abschluss.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins schließen Bestellrunden ab.')
    const r = runde(e.app, e.request.pathValue('id'))
    return e.json(200, { nicht_fertig: nichtFertig(e.app, r.id).length })
  },
  $apis.requireAuth('mitglieder'),
)

// Abschließen: fertige Aufträge sind mitbestellt, nicht fertige nur mit
// `mitnehmen`. Verzicht und Aufträge ohne Positionen nie. Mitbestellte
// Aufträge bekommen Stückpreise und Summe festgehalten.
routerAdd(
  'POST',
  '/api/club/bestellrunden/{id}/abschliessen',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    const { aktuellerStueckpreis, positionenVon, festeSumme, runde } = require(
      `${__hooks}/lib/abschluss.js`,
    )
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins schließen Bestellrunden ab.')
    const mitnehmen = !!(e.requestInfo().body || {}).mitnehmen
    const id = e.request.pathValue('id')

    e.app.runInTransaction((tx) => {
      const r = runde(tx, id)
      if (r.getString('status') !== 'offen')
        throw new BadRequestError('Die Bestellrunde ist schon abgeschlossen.')

      const auftraege = tx.findRecordsByFilter(
        'auftraege',
        'runde = {:runde}',
        '',
        0,
        0,
        { runde: r.id },
      )
      for (const auftrag of auftraege) {
        const positionen = positionenVon(tx, auftrag.id)
        const status = auftrag.getString('status')
        const mitbestellt =
          positionen.length > 0 &&
          (status === 'fertig' || (status === 'in_arbeit' && mitnehmen))
        for (const position of positionen) {
          position.set(
            'stueckpreis',
            mitbestellt ? aktuellerStueckpreis(tx, position) : 0,
          )
          tx.save(position)
        }
        auftrag.set('mitbestellt', mitbestellt)
        auftrag.set('summe', mitbestellt ? festeSumme(tx, auftrag) : 0)
        tx.save(auftrag)
      }

      r.set('status', 'abgeschlossen')
      r.set('abgeschlossen_am', new DateTime())
      tx.save(r)
    })

    return e.json(200, runde(e.app, id))
  },
  $apis.requireAuth('mitglieder'),
)

// Wieder öffnen: nur ohne andere offene Runde. Festpreise und `mitbestellt`
// gehen, die Summe folgt wieder den aktuellen Preisen.
routerAdd(
  'POST',
  '/api/club/bestellrunden/{id}/oeffnen',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    const { positionenVon, runde } = require(`${__hooks}/lib/abschluss.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins öffnen Bestellrunden wieder.')
    const id = e.request.pathValue('id')

    e.app.runInTransaction((tx) => {
      const r = runde(tx, id)
      if (r.getString('status') !== 'abgeschlossen')
        throw new BadRequestError('Die Bestellrunde ist schon offen.')
      const offen = tx.findRecordsByFilter(
        'bestellrunden',
        "status = 'offen'",
        '',
        1,
        0,
      )
      if (offen.length > 0)
        throw new BadRequestError(
          'Es ist schon eine andere Bestellrunde offen.',
        )

      const auftraege = tx.findRecordsByFilter(
        'auftraege',
        'runde = {:runde}',
        '',
        0,
        0,
        { runde: r.id },
      )
      for (const auftrag of auftraege) {
        for (const position of positionenVon(tx, auftrag.id)) {
          position.set('stueckpreis', 0)
          tx.save(position)
        }
        auftrag.set('mitbestellt', false)
        auftrag.set('summe', 0)
        tx.save(auftrag)
      }

      r.set('status', 'offen')
      r.set('abgeschlossen_am', '')
      tx.save(r)
    })

    return e.json(200, runde(e.app, id))
  },
  $apis.requireAuth('mitglieder'),
)

// Nach dem Abschluss ändern Admins noch die Korrektur. Die festgehaltene
// Summe zieht dann mit, die Stückpreise bleiben.
onRecordValidate((e) => {
  const { festeSumme } = require(`${__hooks}/lib/abschluss.js`)
  if (!e.record.isNew() && e.record.getBool('mitbestellt')) {
    const r = e.app.findRecordById('bestellrunden', e.record.getString('runde'))
    if (r.getString('status') === 'abgeschlossen')
      e.record.set('summe', festeSumme(e.app, e.record))
  }
  e.next()
}, 'auftraege')
