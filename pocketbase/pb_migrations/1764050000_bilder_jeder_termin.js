/// <reference path="../pb_data/types.d.ts" />

// Bilder zu jedem Termin (Issue #60, siehe GLOSSARY.md): Stammtisch,
// Veranstaltung und Urlaub. Die Regeln grenzen die Art nicht mehr ein. Es
// bleibt: Der Termin hat begonnen und ist nicht abgesagt, ein Mitglied lädt
// nur in eigenem Namen hoch und löscht nur eigene Bilder, Admins löschen alle,
// ändern darf niemand. Ein Wechsel der Art blendet keine Bilder mehr aus.
const ADMIN = '(@request.auth.admin = true || @request.auth.support = true)'
const ANGEMELDET = "@request.auth.collectionName = 'mitglieder'"
const MIT_URLAUB = "(termin.art = 'veranstaltung' || termin.art = 'urlaub')"

function regeln(art) {
  const nurArt = art ? [art] : []
  return {
    listRule: [ANGEMELDET, ...nurArt].join(' && '),
    viewRule: [ANGEMELDET, ...nurArt].join(' && '),
    createRule: [
      ANGEMELDET,
      'mitglied = @request.auth.id',
      ...nurArt,
      'termin.abgesagt = false',
      'termin.beginn <= @now',
    ].join(' && '),
    deleteRule: [
      ANGEMELDET,
      ...nurArt,
      `(mitglied = @request.auth.id || ${ADMIN})`,
    ].join(' && '),
  }
}

function setzen(app, art) {
  const bilder = app.findCollectionByNameOrId('bilder')
  Object.assign(bilder, regeln(art))
  app.save(bilder)
}

migrate(
  (app) => setzen(app, null),
  (app) => setzen(app, MIT_URLAUB),
)
