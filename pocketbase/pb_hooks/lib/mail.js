// Gemeinsame Hülle für alle Mails der App: Einladung, "Passwort vergessen",
// neue Mail-Adresse bestätigen. Tabellen und Inline-Styles, weil Mailprogramme
// kein CSS aus <style> und kein Flexbox verlässlich können. Das Emblem liegt
// als PNG im Deployment-Volume (club-assets/brand/mail-logo.png), SVG zeigen
// Gmail und Outlook nicht an.

const FARBE = {
  kohle: '#0d0c0b',
  knochen: '#ede4d3',
  rost: '#b8371f',
  messing: '#c89d5c',
  schrift: '#1d1a17',
  leise: '#5b5148',
}

function html(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Alle Links der Mails bauen auf meta.appURL. Ist die App-Adresse in den
// PocketBase-Einstellungen nie eingetragen, steht dort der Standardwert
// http://localhost:8090 und Empfänger landen auf localhost. Dann lieber keine
// Mail als eine mit totem Link.
function pruefeAppUrl(meta) {
  const url = String(meta.appURL || '')
  if (
    !/^https?:\/\//.test(url) ||
    /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)
  ) {
    throw new BadRequestError(
      'Die App-Adresse ist in den PocketBase-Einstellungen nicht gesetzt (Settings > Application URL). Ohne sie führen die Links in den Mails ins Leere.',
    )
  }
}

// absaetze: Array von HTML-Strings (Aufrufer escapen Nutzereingaben selbst).
// button: { text, href }. hinweis: kleiner Text unter dem Button.
function layout(meta, { titel, absaetze, button, hinweis }) {
  pruefeAppUrl(meta)
  const club = html(meta.appName)
  const logo = `${meta.appURL}/club-assets/brand/mail-logo.png`
  const p = (inhalt) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${FARBE.schrift}">${inhalt}</p>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${html(titel)}</title>
</head>
<body style="margin:0;padding:0;background:${FARBE.kohle}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FARBE.kohle}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td align="center" style="padding:0 0 24px">
<img src="${html(logo)}" width="120" height="120" alt="${club}" style="display:block;border:0;width:120px;height:120px">
</td></tr>
<tr><td style="background:${FARBE.knochen};border-top:4px solid ${FARBE.rost};border-radius:4px;padding:32px 28px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:700;color:${FARBE.schrift}">${html(titel)}</h1>
${absaetze.map(p).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
<tr><td style="border-radius:4px;background:${FARBE.rost}">
<a href="${html(button.href)}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:4px">${html(button.text)}</a>
</td></tr>
</table>
<p style="margin:0;font-size:13px;line-height:1.5;color:${FARBE.leise}">${hinweis}</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${FARBE.leise};word-break:break-all">Button geht nicht? Diesen Link in den Browser kopieren:<br>${html(button.href)}</p>
</td></tr>
<tr><td align="center" style="padding:20px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${FARBE.messing}">${club} &middot; Est. 1999</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

module.exports = { html, layout, pruefeAppUrl }
