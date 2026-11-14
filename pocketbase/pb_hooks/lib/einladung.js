// Einladungsmail mit festem Text: Clubname, wer einlädt, Button "Passwort
// setzen". Der Link ist ein gewöhnliches Reset-Token der Collection
// `mitglieder` (7 Tage), sodass /passwort-setzen Einladung und "Passwort
// vergessen" gleich behandelt.

function html(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sendeEinladung(app, mitglied, einladender) {
  const meta = app.settings().meta
  const club = html(meta.appName)
  const wer = html(einladender ? einladender.getString('name') : meta.appName)
  const link = `${meta.appURL}/passwort-setzen?token=${mitglied.newPasswordResetToken()}`

  const message = new MailerMessage({
    from: { address: meta.senderAddress, name: meta.senderName },
    to: [{ address: mitglied.email() }],
    subject: `Einladung zu ${meta.appName}`,
    html: `<p>Hallo ${html(mitglied.getString('name'))},</p>
<p>${wer} lädt dich in die App von ${club} ein. Setze dein Passwort, dann kannst du dich anmelden.</p>
<p><a href="${html(link)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#b8371f;color:#ffffff;font-weight:600;text-decoration:none">Passwort setzen</a></p>
<p>Der Link gilt 7 Tage. Ist er abgelaufen, schickt dir ein Admin eine neue Einladung.</p>`,
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
