/// <reference path="../pb_data/types.d.ts" />

// Mitgliederverwaltung (Spec #17): Admins vergeben und entziehen das
// Admin-Recht, sperren, ändern die Mail direkt und löschen falsch angelegte
// Mitglieder. Das Support-Konto taucht in keiner Liste auf und lässt sich nur
// von einem Support-Konto ändern; zum Support-Konto macht nur der Superuser.
// Die Mail anderer ändern erlaubt PocketBase nur mit manageRule, ohne
// Bestätigungsmail. Dass immer ein Admin bleibt, prüft mitglieder.pb.js.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"
const SICHTBAR = '(support = false || @request.auth.support = true)'
const LESEN = `${ANGEMELDET} && (id = @request.auth.id || (${ADMIN} && support = false))`
const VERWALTEN = `${ANGEMELDET} && ${ADMIN} && ${SICHTBAR}`
const NUR_ADMIN_FELDER = [
  'name',
  'email',
  'emailVisibility',
  'verified',
  'admin',
  'gesperrt',
  'ehemalig',
]
const SELBST = [
  'id = @request.auth.id',
  ...NUR_ADMIN_FELDER.map((f) => `@request.body.${f}:isset = false`),
].join(' && ')

migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.listRule = LESEN
    mitglieder.viewRule = LESEN
    mitglieder.updateRule = `${ANGEMELDET} && @request.body.support:isset = false && ((${ADMIN} && ${SICHTBAR}) || (${SELBST}))`
    mitglieder.deleteRule = VERWALTEN
    mitglieder.manageRule = VERWALTEN
    app.save(mitglieder)
  },
  (app) => {
    const ADMIN_ALT = `${ANGEMELDET} && ${ADMIN}`
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.listRule = `${ANGEMELDET} && (id = @request.auth.id || ${ADMIN})`
    mitglieder.viewRule = `${ANGEMELDET} && (id = @request.auth.id || ${ADMIN})`
    mitglieder.updateRule = `${ANGEMELDET} && (${ADMIN} || (${SELBST} && @request.body.support:isset = false))`
    mitglieder.deleteRule = ADMIN_ALT
    mitglieder.manageRule = null
    app.save(mitglieder)
  },
)
