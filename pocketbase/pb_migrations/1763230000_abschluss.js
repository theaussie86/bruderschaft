/// <reference path="../pb_data/types.d.ts" />

// Abschließen und Wieder öffnen (Spec #17). Beim Abschließen hält die
// Hook-Route den Stückpreis jeder Position und die Summe jedes Auftrags fest
// und setzt `mitbestellt`. Diese Felder schreibt nur die Hook-Route, deshalb
// sperren die Rules sie im Body für alle (ADR 0002).
//
// Nach dem Abschluss ändern Admins am Auftrag nur noch Korrektur und bezahlt.
// Dazu kommt die Collection `einstellungen` mit genau einem Datensatz, den
// alle Mitglieder lesen und nur Admins ändern.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"

const FESTWERTE_GESPERRT = [
  '@request.body.mitbestellt:isset = false',
  '@request.body.summe:isset = false',
].join(' && ')

const OFFEN = "runde.status = 'offen'"
const OFFEN_ODER_NACHTRAG = `(${OFFEN} || (${[
  ADMIN,
  "runde.status = 'abgeschlossen'",
  '@request.body.status:isset = false',
  '@request.body.anmerkung:isset = false',
].join(' && ')}))`

const STUECKPREIS_GESPERRT = '@request.body.stueckpreis:isset = false'

migrate(
  (app) => {
    const auftraege = app.findCollectionByNameOrId('auftraege')
    auftraege.fields.add(new BoolField({ name: 'mitbestellt' }))
    // Festgehaltene Summe in Cent inklusive Korrektur, nur bei mitbestellten
    // Aufträgen abgeschlossener Runden. Sonst rechnet die App live.
    auftraege.fields.add(new NumberField({ name: 'summe', onlyInt: true }))
    auftraege.createRule = `${auftraege.createRule} && ${FESTWERTE_GESPERRT}`
    auftraege.updateRule = `${auftraege.updateRule.replace(OFFEN, OFFEN_ODER_NACHTRAG)} && ${FESTWERTE_GESPERRT}`
    app.save(auftraege)

    const positionen = app.findCollectionByNameOrId('positionen')
    // Festgehaltener Stückpreis in Cent inklusive Aufpreisen der Größe und
    // der belegten Druckstellen.
    positionen.fields.add(
      new NumberField({ name: 'stueckpreis', onlyInt: true }),
    )
    positionen.createRule = `${positionen.createRule} && ${STUECKPREIS_GESPERRT}`
    positionen.updateRule = `${positionen.updateRule} && ${STUECKPREIS_GESPERRT}`
    app.save(positionen)

    const einstellungen = new Collection({
      type: 'base',
      name: 'einstellungen',
      listRule: ANGEMELDET,
      viewRule: ANGEMELDET,
      createRule: null,
      updateRule: `${ANGEMELDET} && ${ADMIN}`,
      deleteRule: null,
    })
    einstellungen.fields.add(
      new TextField({ name: 'zahlungshinweis', max: 2000 }),
    )
    app.save(einstellungen)
    app.save(new Record(einstellungen))
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('einstellungen'))

    const positionen = app.findCollectionByNameOrId('positionen')
    positionen.createRule = positionen.createRule.replace(
      ` && ${STUECKPREIS_GESPERRT}`,
      '',
    )
    positionen.updateRule = positionen.updateRule.replace(
      ` && ${STUECKPREIS_GESPERRT}`,
      '',
    )
    positionen.fields.removeByName('stueckpreis')
    app.save(positionen)

    const auftraege = app.findCollectionByNameOrId('auftraege')
    auftraege.createRule = auftraege.createRule.replace(
      ` && ${FESTWERTE_GESPERRT}`,
      '',
    )
    auftraege.updateRule = auftraege.updateRule
      .replace(` && ${FESTWERTE_GESPERRT}`, '')
      .replace(OFFEN_ODER_NACHTRAG, OFFEN)
    auftraege.fields.removeByName('mitbestellt')
    auftraege.fields.removeByName('summe')
    app.save(auftraege)
  },
)
