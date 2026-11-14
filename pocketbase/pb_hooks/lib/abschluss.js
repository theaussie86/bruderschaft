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

// Positionen, deren Artikel, Größe, Druckstelle oder Motiv inzwischen
// ausgeblendet ist, aus allen Aufträgen der Runde außer Verzicht. Für die
// Warnung vor dem Abschließen, mit Mitglied, Artikel und Größe.
function nichtVerfuegbar(app, rundeId) {
  const ausgeblendet = (collection, id) => {
    try {
      return app.findRecordById(collection, id).getBool('ausgeblendet')
    } catch {
      return false
    }
  }
  const auftraege = app.findRecordsByFilter(
    'auftraege',
    "runde = {:runde} && status != 'verzicht'",
    '',
    0,
    0,
    { runde: rundeId },
  )
  const liste = []
  for (const auftrag of auftraege) {
    const mitglied = app.findRecordById(
      'mitglieder',
      auftrag.getString('mitglied'),
    )
    for (const position of positionenVon(app, auftrag.id)) {
      const belegungen = app.findRecordsByFilter(
        'belegungen',
        'position = {:id}',
        '',
        0,
        0,
        { id: position.id },
      )
      const betroffen =
        ausgeblendet('artikel', position.getString('artikel')) ||
        ausgeblendet('groessen', position.getString('groesse')) ||
        belegungen.some(
          (b) =>
            ausgeblendet('druckstellen', b.getString('druckstelle')) ||
            (!!b.getString('motiv') &&
              ausgeblendet('motive', b.getString('motiv'))),
        )
      if (!betroffen) continue
      liste.push({
        mitglied: mitglied.getString('name'),
        artikel: app
          .findRecordById('artikel', position.getString('artikel'))
          .getString('name'),
        groesse: app
          .findRecordById('groessen', position.getString('groesse'))
          .getString('name'),
      })
    }
  }
  return liste.sort(
    (x, y) =>
      x.mitglied.localeCompare(y.mitglied) ||
      x.artikel.localeCompare(y.artikel),
  )
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
  nichtVerfuegbar,
  runde,
}
