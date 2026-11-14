const euroFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const euro = (n: number) => euroFmt.format(n).replace(/\s/g, '\u00a0')

export const signedEuro = (n: number) => (n > 0 ? `+${euro(n)}` : euro(n))

const parse = (iso: string) => {
  const [d, t = '00:00'] = iso.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  return new Date(y, m - 1, day, hh, mm)
}

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MON_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const pad = (n: number) => String(n).padStart(2, '0')

/** 30.11.2026 */
export const dateShort = (iso: string) => {
  const d = parse(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Mo, 30.11.2026 */
export const dateWithDay = (iso: string) => `${WD[parse(iso).getDay()]}, ${dateShort(iso)}`

/** Montag, 30. November 2026 */
export const dateLong = (iso: string) => {
  const d = parse(iso)
  return `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const time = (iso: string) => {
  if (!iso.includes('T')) return ''
  const d = parse(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const parts = (iso: string) => {
  const d = parse(iso)
  return {
    day: d.getDate(),
    weekday: WD[d.getDay()],
    month: MON_SHORT[d.getMonth()],
    monthLong: MONTHS[d.getMonth()],
    year: d.getFullYear(),
    key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
  }
}

/** Geburtstag im Jahr `year`; der 29.02. fällt in Nicht-Schaltjahren auf den 28.02. Rückgabe: ISO-Datum. */
export const birthdayIn = (birthday: string, year: number) => {
  const [, m, d] = birthday.split('-').map(Number)
  const leap = new Date(year, 1, 29).getMonth() === 1
  const day = m === 2 && d === 29 && !leap ? 28 : d
  return `${year}-${pad(m)}-${pad(day)}`
}
