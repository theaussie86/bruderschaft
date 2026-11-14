/// <reference path="../pb_data/types.d.ts" />

// Die Standardmails von PocketBase bekommen die Club-Hülle aus lib/mail.js.
// Die Templates in den Collection-Einstellungen bleiben als Rückfall stehen,
// verschickt wird aber immer, was hier gebaut wird. Links zeigen auf Seiten der
// App, nie auf das Admin-UI von PocketBase.

onMailerRecordPasswordResetSend((e) => {
  const { html, layout } = require(`${__hooks}/lib/mail.js`)
  const meta = e.app.settings().meta
  e.message.subject = `Neues Passwort für ${meta.appName}`
  e.message.html = layout(meta, {
    titel: 'Neues Passwort',
    absaetze: [
      `Hallo ${html(e.record.getString('name'))},`,
      `für dein Konto bei ${html(meta.appName)} wurde ein neues Passwort angefordert.`,
    ],
    button: {
      text: 'Passwort setzen',
      href: `${meta.appURL}/passwort-setzen?token=${e.meta.token}`,
    },
    hinweis:
      'Der Link gilt 7 Tage. Wenn du kein neues Passwort angefordert hast, ignorier diese Mail, dann bleibt alles, wie es ist.',
  })
  e.next()
}, 'mitglieder')

// Geht an die NEUE Adresse. Die Seite /email-bestaetigen kommt mit dem
// Feature "Mail-Adresse ändern" und ruft confirmEmailChange(token, passwort).
onMailerRecordEmailChangeSend((e) => {
  const { html, layout } = require(`${__hooks}/lib/mail.js`)
  const meta = e.app.settings().meta
  e.message.subject = `Neue Mail-Adresse für ${meta.appName} bestätigen`
  e.message.html = layout(meta, {
    titel: 'Neue Mail-Adresse bestätigen',
    absaetze: [
      `Hallo ${html(e.record.getString('name'))},`,
      `du willst dich bei ${html(meta.appName)} künftig mit <strong>${html(e.meta.newEmail)}</strong> anmelden. Bestätige die neue Adresse, dann gilt sie ab sofort.`,
    ],
    button: {
      text: 'Adresse bestätigen',
      href: `${meta.appURL}/email-bestaetigen?token=${e.meta.token}`,
    },
    hinweis:
      'Der Link gilt 30 Minuten. Warst du das nicht, ignorier diese Mail, dann bleibt deine alte Adresse.',
  })
  e.next()
}, 'mitglieder')
