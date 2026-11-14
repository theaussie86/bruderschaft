/// <reference path="../pb_data/types.d.ts" />

// Korrektur und bezahlt am Auftrag (Spec #17, Admin-Übersicht der Runde). Die
// Korrektur ist ein Betrag in Cent mit Vorzeichen und einer Begründung. Beide
// Felder und `bezahlt` setzen nur Admins; PocketBase kennt keine Rechte pro
// Feld, deshalb sperren die Rules sie im Body für alle anderen (ADR 0002).
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const NUR_ADMIN = `(${ADMIN} || (${[
  '@request.body.bezahlt:isset = false',
  '@request.body.korrektur_betrag:isset = false',
  '@request.body.korrektur_grund:isset = false',
].join(' && ')}))`

migrate(
  (app) => {
    const auftraege = app.findCollectionByNameOrId('auftraege')
    auftraege.fields.add(new BoolField({ name: 'bezahlt' }))
    auftraege.fields.add(
      new NumberField({ name: 'korrektur_betrag', onlyInt: true }),
    )
    auftraege.fields.add(new TextField({ name: 'korrektur_grund', max: 200 }))
    auftraege.createRule = `${auftraege.createRule} && ${NUR_ADMIN}`
    auftraege.updateRule = `${auftraege.updateRule} && ${NUR_ADMIN}`
    app.save(auftraege)
  },
  (app) => {
    const auftraege = app.findCollectionByNameOrId('auftraege')
    auftraege.createRule = auftraege.createRule.replace(` && ${NUR_ADMIN}`, '')
    auftraege.updateRule = auftraege.updateRule.replace(` && ${NUR_ADMIN}`, '')
    auftraege.fields.removeByName('bezahlt')
    auftraege.fields.removeByName('korrektur_betrag')
    auftraege.fields.removeByName('korrektur_grund')
    app.save(auftraege)
  },
)
