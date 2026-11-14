/// <reference path="../pb_data/types.d.ts" />

// Einladung und "Passwort vergessen" nutzen denselben Link (Spec #17): ein
// Reset-Token, das 7 Tage gilt und auf die Seite /passwort-setzen der App
// führt. Clubname ({APP_NAME}) und App-Adresse ({APP_URL}) kommen aus den
// PocketBase-Einstellungen, nicht aus dem Code.
migrate(
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.passwordResetToken.duration = 7 * 24 * 60 * 60
    mitglieder.resetPasswordTemplate.subject = 'Neues Passwort für {APP_NAME}'
    mitglieder.resetPasswordTemplate.body = `<p>Hallo,</p>
<p>für dein Konto bei {APP_NAME} wurde ein neues Passwort angefordert.</p>
<p><a href="{APP_URL}/passwort-setzen?token={TOKEN}" target="_blank" rel="noopener">Passwort setzen</a></p>
<p>Der Link gilt 7 Tage. Wenn du kein neues Passwort angefordert hast, ignoriere diese Mail.</p>`
    app.save(mitglieder)
  },
  (app) => {
    const mitglieder = app.findCollectionByNameOrId('mitglieder')
    mitglieder.passwordResetToken.duration = 30 * 60
    app.save(mitglieder)
  },
)
