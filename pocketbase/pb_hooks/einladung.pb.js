/// <reference path="../pb_data/types.d.ts" />

// Ein Admin legt ein Mitglied nur mit Name und Mail an (Spec #17). Ein
// mitgeschicktes Passwort zählt nicht: Das Mitglied bekommt ein
// Zufallspasswort und setzt sein eigenes über die Einladung. Legt der
// Superuser direkt an (Einrichtung, Tests), geht keine Mail raus.
onRecordCreateRequest((e) => {
  const { sendeEinladung, istAdmin } = require(`${__hooks}/lib/einladung.js`)
  if (!istAdmin(e.auth)) return e.next()

  e.record.setRandomPassword()
  e.record.setVerified(false)
  e.next()

  try {
    sendeEinladung(e.app, e.record, e.auth)
  } catch (err) {
    e.app
      .logger()
      .error(
        'Einladungsmail fehlgeschlagen',
        'mitglied',
        e.record.id,
        'error',
        String(err),
      )
    throw new BadRequestError(
      'Das Mitglied ist angelegt, aber die Einladungsmail konnte nicht verschickt werden. Bitte erneut einladen.',
    )
  }
}, 'mitglieder')

// Erneut einladen: nur bei eingeladenen Mitgliedern. Ein neuer tokenKey macht
// den alten Link ungültig.
routerAdd(
  'POST',
  '/api/club/mitglieder/{id}/einladen',
  (e) => {
    const { sendeEinladung, istAdmin } = require(`${__hooks}/lib/einladung.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins können einladen.')

    let mitglied
    try {
      mitglied = e.app.findRecordById('mitglieder', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('Mitglied nicht gefunden.')
    }
    if (mitglied.verified()) {
      throw new BadRequestError('Das Mitglied ist schon aktiv.')
    }

    mitglied.refreshTokenKey()
    e.app.save(mitglied)
    sendeEinladung(e.app, mitglied, e.auth)
    return e.noContent(204)
  },
  $apis.requireAuth('mitglieder'),
)
