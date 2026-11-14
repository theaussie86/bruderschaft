/// <reference path="../pb_data/types.d.ts" />

// Mails der App (Hülle in pb_hooks/lib/mail.js, Versand in pb_hooks/mail.pb.js).
// Die Login-Warnung ("Anmeldung von neuem Gerät") ist aus: Bei rund 20
// Mitgliedern auf wechselnden Handys wäre sie nur Rauschen. Das Template für
// die Mail-Änderung zeigt als Rückfall auf die Seite der App statt auf das
// Admin-UI von PocketBase.
migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.authAlert.enabled = false
    mitglieder.confirmEmailChangeTemplate.subject =
      'Neue Mail-Adresse für {APP_NAME} bestätigen'
    mitglieder.confirmEmailChangeTemplate.body = `<p>Hallo,</p>
<p>bestätige deine neue Mail-Adresse für {APP_NAME}.</p>
<p><a href="{APP_URL}/email-bestaetigen?token={TOKEN}" target="_blank" rel="noopener">Adresse bestätigen</a></p>
<p>Warst du das nicht, ignorier diese Mail.</p>`
    app.save(mitglieder)
  },
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.authAlert.enabled = true
    app.save(mitglieder)
  },
)
