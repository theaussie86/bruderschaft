// Preise festhalten beim Abschließen einer Bestellrunde (Spec #17). Liegt
// hier, weil Handler in pb_hooks keine Funktionen der eigenen Datei sehen.

// Artikelpreis plus Aufpreis der Größe und der belegten Druckstellen, aus den
// aktuellen Preisen des Sortiments.
function aktuellerStueckpreis(app, position) {
  const artikel = app.findRecordById('artikel', position.getString('artikel'))
  const groesse = app.findRecordById('groessen', position.getString('groesse'))
  let preis = artikel.getInt('preis') + groesse.getInt('aufpreis')
  const belegungen = app.findRecordsByFilter(
    'belegungen',
    'position = {:id}',
    '',
    0,
    0,
    { id: position.id },
  )
  for (const belegung of belegungen) {
    const druckstelle = app.findRecordById(
      'druckstellen',
      belegung.getString('druckstelle'),
    )
    preis += druckstelle.getInt('aufpreis')
  }
  return preis
}

function positionenVon(app, auftragId) {
  return app.findRecordsByFilter('positionen', 'auftrag = {:id}', '', 0, 0, {
    id: auftragId,
  })
}

// Summe aus den festgehaltenen Stückpreisen plus Korrektur.
function festeSumme(app, auftrag) {
  let summe = auftrag.getInt('korrektur_betrag')
  for (const position of positionenVon(app, auftrag.id)) {
    summe += position.getInt('stueckpreis') * position.getInt('anzahl')
  }
  return summe
}

// Nicht fertige Aufträge: in Arbeit und mit mindestens einer Position. Nur
// diese lassen sich beim Abschließen mitnehmen oder weglassen.
function nichtFertig(app, rundeId) {
  return app
    .findRecordsByFilter(
      'auftraege',
      "runde = {:runde} && status = 'in_arbeit'",
      '',
      0,
      0,
      { runde: rundeId },
    )
    .filter((auftrag) => positionenVon(app, auftrag.id).length > 0)
}

function runde(app, id) {
  try {
    return app.findRecordById('bestellrunden', id)
  } catch {
    throw new NotFoundError('Bestellrunde nicht gefunden.')
  }
}

module.exports = {
  aktuellerStueckpreis,
  positionenVon,
  festeSumme,
  nichtFertig,
  runde,
}
