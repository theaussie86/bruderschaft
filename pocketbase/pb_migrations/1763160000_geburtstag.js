/// <reference path="../pb_data/types.d.ts" />

// Geburtstag (mit Jahr) am Mitglied, Spec #17. Jedes Mitglied ändert neben
// seinem Passwort nur den eigenen Geburtstag; Admins (inkl. Support-Konto)
// ändern alles. PocketBase kennt keine Rechte pro Feld, deshalb schützt die
// Rule die übrigen Felder mit `:isset = false` (ADR 0002). Das Leeren eines
// gesetzten Geburtstags verhindert der Hook geburtstag.pb.js.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"
const NUR_ADMIN_FELDER = [
  'name',
  'email',
  'emailVisibility',
  'verified',
  'admin',
  'gesperrt',
  'support',
  'ehemalig',
]
const SELBST = [
  'id = @request.auth.id',
  ...NUR_ADMIN_FELDER.map((f) => `@request.body.${f}:isset = false`),
].join(' && ')

migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.fields.add(new DateField({ name: 'geburtstag' }))
    mitglieder.updateRule = `${ANGEMELDET} && (${ADMIN} || (${SELBST}))`
    app.save(mitglieder)
  },
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.fields.removeByName('geburtstag')
    mitglieder.updateRule = `${ANGEMELDET} && ${ADMIN}`
    app.save(mitglieder)
  },
)
