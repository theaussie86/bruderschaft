// Einladungsmail: Clubname, wer einlädt, Button "Passwort setzen". Der Link
// ist ein gewöhnliches Reset-Token der Collection `mitglieder` (7 Tage),
// sodass /passwort-setzen Einladung und "Passwort vergessen" gleich behandelt.
// Hülle und Farben aus lib/mail.js.

function sendeEinladung(app, mitglied, einladender) {
  const { html, layout } = require(`${__hooks}/lib/mail.js`)
  const meta = app.settings().meta
  const wer = einladender ? einladender.getString('name') : meta.appName
  const link = `${meta.appURL}/passwort-setzen?token=${mitglied.newPasswordResetToken()}`

  const message = new MailerMessage({
    from: { address: meta.senderAddress, name: meta.senderName },
    to: [{ address: mitglied.email() }],
    subject: `Einladung zu ${meta.appName}`,
    html: layout(meta, {
      titel: 'Du bist eingeladen',
      absaetze: [
        `Hallo ${html(mitglied.getString('name'))},`,
        `${html(wer)} lädt dich in die App von ${html(meta.appName)} ein. Setz dein Passwort, dann kannst du dich anmelden.`,
      ],
      button: { text: 'Passwort setzen', href: link },
      hinweis:
        'Der Link gilt 7 Tage. Ist er abgelaufen, schickt dir ein Admin eine neue Einladung.',
    }),
  })
  app.newMailClient().send(message)
}

function istAdmin(auth) {
  return (
    !!auth &&
    auth.collection().name === 'mitglieder' &&
    (auth.getBool('admin') || auth.getBool('support'))
  )
}

module.exports = { sendeEinladung, istAdmin }
