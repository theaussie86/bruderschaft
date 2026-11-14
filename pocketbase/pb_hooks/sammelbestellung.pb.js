/// <reference path="../pb_data/types.d.ts" />

// Clubname für den Kopf der Sammelbestellung (Spec #17). Er steht in den
// PocketBase-Einstellungen ({APP_NAME}), die die App ohne Superuser-Token
// nicht lesen kann. Nur Admins rufen die Sammelbestellung ab.
routerAdd(
  'GET',
  '/api/club/clubname',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins rufen die Sammelbestellung ab.')
    return e.json(200, { name: e.app.settings().meta.appName })
  },
  $apis.requireAuth('mitglieder'),
)
