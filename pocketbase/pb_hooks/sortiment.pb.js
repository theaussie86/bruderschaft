/// <reference path="../pb_data/types.d.ts" />

// Ausblenden statt Löschen im Sortiment (Spec #17, ADR 0002). Ausgeblendetes
// ist für neue Positionen nicht wählbar, bestehende Positionen bleiben
// gültig. Gelöscht wird nur, was nie bestellt wurde.

onRecordValidate((e) => {
  const { eingeblendetPruefen } = require(`${__hooks}/lib/sortiment.js`)
  eingeblendetPruefen(
    e.app,
    e.record,
    'artikel',
    'artikel',
    'Dieser Artikel ist nicht mehr verfügbar.',
  )
  eingeblendetPruefen(
    e.app,
    e.record,
    'groesse',
    'groessen',
    'Diese Größe ist nicht mehr verfügbar.',
  )
  e.next()
}, 'positionen')

onRecordValidate((e) => {
  const { eingeblendetPruefen } = require(`${__hooks}/lib/sortiment.js`)
  eingeblendetPruefen(
    e.app,
    e.record,
    'druckstelle',
    'druckstellen',
    'Diese Druckstelle ist nicht mehr verfügbar.',
  )
  eingeblendetPruefen(
    e.app,
    e.record,
    'motiv',
    'motive',
    'Dieses Motiv ist nicht mehr verfügbar.',
  )
  e.next()
}, 'belegungen')

// Die Relationen verhindern das Löschen von Bestelltem schon, beim Motiv
// würde PocketBase die Belegung aber still leeren. Die Prüfung hier deckt
// alle vier ab und liefert eine verständliche Meldung.
onRecordDelete(
  (e) => {
    const { bestellt } = require(`${__hooks}/lib/sortiment.js`)
    if (bestellt(e.app, e.record)) {
      throw new BadRequestError(
        `"${e.record.getString('name')}" wurde schon bestellt und lässt sich nicht löschen. Bitte ausblenden.`,
      )
    }
    e.next()
  },
  'artikel',
  'groessen',
  'druckstellen',
  'motive',
)

// Artikel kopieren, z. B. für eine neue Farbe: mit Bild, Größen, Druckstellen
// und erlaubten Motiven, in einer Transaktion. Die Kopie steht am Ende der
// Liste und ist eingeblendet; Größen und Druckstellen behalten ihren Stand.
routerAdd(
  'POST',
  '/api/club/artikel/{id}/kopieren',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    const { kopie, dateiKopie } = require(`${__hooks}/lib/sortiment.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins kopieren Artikel.')

    let original = null
    try {
      original = e.app.findRecordById('artikel', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('Artikel nicht gefunden.')
    }

    let ergebnis = null
    e.app.runInTransaction((tx) => {
      const letzte = tx.findRecordsByFilter('artikel', '', '-sortierung', 1, 0)
      const neu = kopie(tx, original, {
        name: `${original.getString('name')} (Kopie)`.slice(0, 100),
        sortierung: (letzte.length ? letzte[0].getInt('sortierung') : 0) + 1,
        ausgeblendet: false,
      })
      const bild = dateiKopie(tx, original, 'bild')
      if (bild) neu.set('bild', bild)
      tx.save(neu)

      for (const collection of ['groessen', 'druckstellen']) {
        const eintraege = tx.findRecordsByFilter(
          collection,
          'artikel = {:id}',
          'sortierung,created',
          0,
          0,
          { id: original.id },
        )
        for (const eintrag of eintraege)
          tx.save(kopie(tx, eintrag, { artikel: neu.id }))
      }
      ergebnis = neu
    })

    return e.json(200, ergebnis)
  },
  $apis.requireAuth('mitglieder'),
)
