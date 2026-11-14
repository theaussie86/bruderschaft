/// <reference path="../pb_data/types.d.ts" />

// Kalender-Abo und Geburtstage (Spec #17, ADR 0002).

// Der iCal-Feed. Ohne Anmeldung, aber nur mit dem gültigen Token aus
// `einstellungen`. Die App reicht ihn unter /kalender-abo/<token>.ics durch.
routerAdd('GET', '/api/club/kalender-abo/{token}', (e) => {
  const { ical } = require(`${__hooks}/lib/kalender.js`)
  const token = e.request.pathValue('token')
  const einstellungen = e.app.findAllRecords('einstellungen')[0]
  const gueltig = einstellungen && einstellungen.getString('kalender_token')
  if (!token || !gueltig || !$security.equal(token, gueltig))
    throw new NotFoundError('Kalender nicht gefunden.')

  e.response.header().set('Content-Type', 'text/calendar; charset=utf-8')
  e.response.header().set('Cache-Control', 'no-store')
  return e.string(200, ical(e.app, new Date()))
})

// Ein Admin erneuert den Link. Der alte Token gilt ab sofort nicht mehr.
routerAdd(
  'POST',
  '/api/club/kalender-abo/erneuern',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins erneuern den Kalender-Link.')
    const einstellungen = e.app.findAllRecords('einstellungen')[0]
    if (!einstellungen) throw new NotFoundError('Keine Einstellungen.')
    einstellungen.set('kalender_token', $security.randomString(40))
    e.app.save(einstellungen)
    return e.json(200, {
      kalender_token: einstellungen.getString('kalender_token'),
    })
  },
  $apis.requireAuth('mitglieder'),
)

// Geburtstage für den Kalender der App. Mitglieder dürfen andere Mitglieder
// nicht lesen (Mail-Adressen), deshalb liefert diese Route nur Name, Datum
// und Alter, für höchstens ein Jahr und einen Tag.
routerAdd(
  'GET',
  '/api/club/geburtstage',
  (e) => {
    const { geburtstageZwischen } = require(`${__hooks}/lib/kalender.js`)
    const von = e.request.url.query().get('von')
    const bis = e.request.url.query().get('bis')
    const tag = /^\d{4}-\d{2}-\d{2}$/
    const ms = (t) => Date.parse(`${t}T00:00:00Z`)
    if (
      !tag.test(von) ||
      !tag.test(bis) ||
      isNaN(ms(von)) ||
      isNaN(ms(bis)) ||
      ms(bis) < ms(von) ||
      ms(bis) - ms(von) > 366 * 24 * 60 * 60 * 1000
    )
      throw new BadRequestError('Ungültiger Zeitraum.')
    return e.json(200, geburtstageZwischen(e.app, von, bis))
  },
  $apis.requireAuth('mitglieder'),
)
