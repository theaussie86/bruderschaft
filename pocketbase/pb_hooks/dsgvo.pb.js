/// <reference path="../pb_data/types.d.ts" />

// DSGVO-Löschung (Spec #17, ADR 0002): Ein Admin löscht auf Wunsch die Daten
// eines Mitglieds. Der Datensatz bleibt, damit Aufträge und Bilder ihre
// Relation behalten, und läuft als "Ehemaliges Mitglied" weiter. Name, Mail,
// Geburtstag, Anschrift (mit vollem Namen) und Passwort werden in einer
// Transaktion ersetzt; ein neues Zufallspasswort erneuert auch den tokenKey,
// alte Sitzungen gelten nicht mehr. Dass immer ein Admin bleibt, prüft
// mitglieder.pb.js.
routerAdd(
  'POST',
  '/api/club/mitglieder/{id}/daten-loeschen',
  (e) => {
    const { istAdmin } = require(`${__hooks}/lib/einladung.js`)
    if (!istAdmin(e.auth))
      throw new ForbiddenError('Nur Admins löschen Mitgliedsdaten.')
    const id = e.request.pathValue('id')

    e.app.runInTransaction((tx) => {
      let mitglied
      try {
        mitglied = tx.findRecordById('mitglieder', id)
      } catch {
        throw new NotFoundError('Mitglied nicht gefunden.')
      }
      // Das Support-Konto ist für Admins unsichtbar, wie in der Liste.
      if (mitglied.getBool('support') && !e.auth.getBool('support'))
        throw new NotFoundError('Mitglied nicht gefunden.')

      mitglied.set('name', 'Ehemaliges Mitglied')
      mitglied.setEmail(`ehemalig-${$security.randomString(24)}@club.invalid`)
      mitglied.setEmailVisibility(false)
      mitglied.setRandomPassword()
      mitglied.set('geburtstag', '')
      for (const feld of ['voller_name', 'strasse', 'plz', 'ort'])
        mitglied.set(feld, '')
      mitglied.set('admin', false)
      mitglied.set('gesperrt', true)
      mitglied.set('ehemalig', true)
      tx.save(mitglied)
    })

    return e.noContent(204)
  },
  $apis.requireAuth('mitglieder'),
)
