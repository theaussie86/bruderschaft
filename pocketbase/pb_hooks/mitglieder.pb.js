/// <reference path="../pb_data/types.d.ts" />

// Es bleibt immer mindestens ein Admin (Spec #17): ein aktives (Passwort
// gesetzt), nicht gesperrtes Mitglied mit Admin-Recht, das kein Support-Konto
// ist. Geprüft wird bei jedem Speichern und Löschen, nicht nur bei
// API-Requests, damit auch Hook-Routen wie die DSGVO-Löschung den letzten
// Admin nicht entfernen.
onRecordValidate((e) => {
  const { zaehltAlsAdmin, letzterAdmin } = require(
    `${__hooks}/lib/letzter-admin.js`,
  )
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  if (
    !e.record.isNew() &&
    zaehltAlsAdmin(e.record.original()) &&
    !zaehltAlsAdmin(e.record) &&
    letzterAdmin(e.app, e.record.id)
  ) {
    const feld =
      e.record.getBool('gesperrt') || e.record.getBool('ehemalig')
        ? 'gesperrt'
        : 'admin'
    throw abgelehnt(
      feld,
      'letzter_admin',
      'Das ist der letzte Admin. Gib vorher einem anderen Mitglied das Admin-Recht.',
    )
  }
  e.next()
}, 'mitglieder')

onRecordDelete((e) => {
  const { zaehltAlsAdmin, letzterAdmin } = require(
    `${__hooks}/lib/letzter-admin.js`,
  )
  const abgelehnt = require(`${__hooks}/lib/abgelehnt.js`)
  if (zaehltAlsAdmin(e.record) && letzterAdmin(e.app, e.record.id)) {
    throw abgelehnt(
      'admin',
      'letzter_admin',
      'Das ist der letzte Admin. Gib vorher einem anderen Mitglied das Admin-Recht.',
    )
  }
  e.next()
}, 'mitglieder')

// Mails sind klein geschrieben gespeichert, egal wie der Admin sie eintippt.
// Sonst steht "Stefan@..." in der Liste und "stefan@..." scheitert beim
// Anmelden, weil PocketBase die Adresse genau vergleicht.
function mailKlein(e) {
  const email = e.record.email()
  const klein = email.trim().toLowerCase()
  if (email !== klein) e.record.setEmail(klein)
  e.next()
}
onRecordCreate(mailKlein, 'mitglieder')
onRecordUpdate(mailKlein, 'mitglieder')

// Beim Anmelden zählt die Schreibweise der Mail nicht.
onRecordAuthWithPasswordRequest((e) => {
  if (!e.record && (!e.identityField || e.identityField === 'email')) {
    try {
      e.record = e.app.findAuthRecordByEmail(
        'mitglieder',
        String(e.identity).trim().toLowerCase(),
      )
    } catch {
      // Unbekannte Mail: PocketBase lehnt wie gewohnt ab.
    }
  }
  e.next()
}, 'mitglieder')
