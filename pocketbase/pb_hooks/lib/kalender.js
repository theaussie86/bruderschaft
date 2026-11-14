// Geburtstage und iCal für Kalender und Kalender-Abo (Spec #17).

const TAG_MS = 24 * 60 * 60 * 1000
// Domain-Teil der UIDs, damit Kalender die Einträge wiedererkennen.
const UID_DOMAIN = 'kalender-abo.club'

function istSchaltjahr(jahr) {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0
}

function zweistellig(n) {
  return String(n).padStart(2, '0')
}

// Der Geburtstag (JJJJ-MM-TT) im angegebenen Jahr mit dem Alter, das das
// Mitglied dann wird. Der 29.02. steht in Nicht-Schaltjahren am 28.02.
// Im Geburtsjahr selbst gibt es keinen Geburtstag.
function geburtstagIm(geburtstag, jahr) {
  const [geburtsjahr, monat, tag] = geburtstag.split('-').map(Number)
  const alter = jahr - geburtsjahr
  if (alter <= 0) return null
  const t = monat === 2 && tag === 29 && !istSchaltjahr(jahr) ? 28 : tag
  return { datum: `${jahr}-${zweistellig(monat)}-${zweistellig(t)}`, alter }
}

// Mitglieder, deren Geburtstag im Kalender steht: nicht ausgetreten, kein
// Support-Konto, Geburtstag angegeben.
function geburtstagskinder(app) {
  return app
    .findRecordsByFilter(
      'mitglieder',
      "gesperrt = false && support = false && geburtstag != ''",
      'name',
      0,
      0,
    )
    .map((m) => ({
      id: m.id,
      name: m.getString('name'),
      geburtstag: m.getString('geburtstag').slice(0, 10),
    }))
}

// Alle Geburtstage zwischen von und bis (JJJJ-MM-TT, beide eingeschlossen),
// nach Datum sortiert. Nur Name, Datum und Alter.
function geburtstageZwischen(app, von, bis) {
  const liste = []
  const kinder = geburtstagskinder(app)
  for (
    let jahr = Number(von.slice(0, 4));
    jahr <= Number(bis.slice(0, 4));
    jahr++
  ) {
    for (const k of kinder) {
      const g = geburtstagIm(k.geburtstag, jahr)
      if (g && g.datum >= von && g.datum <= bis)
        liste.push({ name: k.name, datum: g.datum, alter: g.alter })
    }
  }
  return liste.sort((a, b) =>
    a.datum === b.datum
      ? a.name.localeCompare(b.name)
      : a.datum < b.datum
        ? -1
        : 1,
  )
}

// --- iCal (RFC 5545) ---

function text(wert) {
  return String(wert)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function bytes(zeichen) {
  const c = zeichen.codePointAt(0)
  if (c < 0x80) return 1
  if (c < 0x800) return 2
  if (c < 0x10000) return 3
  return 4
}

// Zeilen dürfen höchstens 75 Bytes lang sein, Folgezeilen beginnen mit einem
// Leerzeichen.
function falten(zeile) {
  const teile = []
  let aktuell = ''
  let laenge = 0
  for (const z of zeile) {
    const b = bytes(z)
    if (laenge + b > 75) {
      teile.push(aktuell)
      aktuell = ' '
      laenge = 1
    }
    aktuell += z
    laenge += b
  }
  teile.push(aktuell)
  return teile.join('\r\n')
}

function tagIcal(tag) {
  return tag.replace(/-/g, '')
}

function folgetag(tag) {
  const [j, m, t] = tag.split('-').map(Number)
  const d = new Date(Date.UTC(j, m - 1, t) + TAG_MS)
  return `${d.getUTCFullYear()}-${zweistellig(d.getUTCMonth() + 1)}-${zweistellig(d.getUTCDate())}`
}

// "2027-07-10 14:00:00.000Z" -> "20270710T140000Z"
function zeitpunktIcal(wert) {
  const [tag, zeit] = wert.split(' ')
  return `${tagIcal(tag)}T${zeit.slice(0, 8).replace(/:/g, '')}Z`
}

function terminZeilen(t, stempel) {
  const beginn = t.getString('beginn')
  const ende = t.getString('ende')
  const abgesagt = t.getBool('abgesagt')
  const zeilen = [
    'BEGIN:VEVENT',
    `UID:termin-${t.id}@${UID_DOMAIN}`,
    `DTSTAMP:${stempel}`,
  ]
  if (t.getBool('ganztaegig')) {
    const letzterTag = (ende || beginn).slice(0, 10)
    zeilen.push(`DTSTART;VALUE=DATE:${tagIcal(beginn.slice(0, 10))}`)
    zeilen.push(`DTEND;VALUE=DATE:${tagIcal(folgetag(letzterTag))}`)
  } else {
    zeilen.push(`DTSTART:${zeitpunktIcal(beginn)}`)
    if (ende) zeilen.push(`DTEND:${zeitpunktIcal(ende)}`)
  }
  const titel = t.getString('titel')
  zeilen.push(`SUMMARY:${text(abgesagt ? `Abgesagt: ${titel}` : titel)}`)
  if (t.getString('ort')) zeilen.push(`LOCATION:${text(t.getString('ort'))}`)
  if (t.getString('infotext'))
    zeilen.push(`DESCRIPTION:${text(t.getString('infotext'))}`)
  if (abgesagt) zeilen.push('STATUS:CANCELLED')
  zeilen.push('END:VEVENT')
  return zeilen
}

function geburtstagZeilen(k, g, stempel) {
  return [
    'BEGIN:VEVENT',
    `UID:geburtstag-${k.id}-${g.datum.slice(0, 4)}@${UID_DOMAIN}`,
    `DTSTAMP:${stempel}`,
    `DTSTART;VALUE=DATE:${tagIcal(g.datum)}`,
    `DTEND;VALUE=DATE:${tagIcal(folgetag(g.datum))}`,
    `SUMMARY:${text(`${k.name} wird ${g.alter}`)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ]
}

// Der ganze Feed: alle Termine, auch abgesagte, und die Geburtstage vom
// Vorjahr bis zwei Jahre voraus. Geburtstage stehen als Einzeltermine darin,
// weil das Alter jedes Jahr ein anderes ist.
function ical(app, jetzt) {
  const meta = app.settings().meta
  const stempel = zeitpunktIcal(jetzt.toISOString().replace('T', ' '))
  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${text(meta.appName)}//Kalender-Abo//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${text(meta.appName)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
  ]

  const termine = app.findRecordsByFilter('termine', '', 'beginn', 0, 0)
  for (const t of termine) {
    zeilen.push(...terminZeilen(t, stempel))
  }

  const jahr = jetzt.getUTCFullYear()
  const kinder = geburtstagskinder(app)
  for (let j = jahr - 1; j <= jahr + 2; j++) {
    for (const k of kinder) {
      const g = geburtstagIm(k.geburtstag, j)
      if (g) zeilen.push(...geburtstagZeilen(k, g, stempel))
    }
  }

  zeilen.push('END:VCALENDAR')
  return zeilen.map(falten).join('\r\n') + '\r\n'
}

module.exports = { geburtstagIm, geburtstageZwischen, ical }
