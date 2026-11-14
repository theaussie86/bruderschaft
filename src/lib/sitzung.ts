// Die Sitzung eines Mitglieds lebt als PocketBase-Token im httpOnly-Cookie.
// JavaScript im Browser sieht das Token nie (ADR 0003).
export const SITZUNGS_COOKIE = 'pb_auth'

// 90 Tage, passend zur Token-Dauer der Collection `mitglieder`. Jede Nutzung
// verlängert die Sitzung über authRefresh in der Root-Route.
export const SITZUNG_SEKUNDEN = 90 * 24 * 60 * 60

export const COOKIE_OPTIONEN = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
} as const

export function sitzungsCookie(token: string) {
  return serialisiere(token, SITZUNG_SEKUNDEN)
}

export function abmeldeCookie() {
  return serialisiere('', 0)
}

function serialisiere(wert: string, maxAge: number) {
  const teile = [
    `${SITZUNGS_COOKIE}=${encodeURIComponent(wert)}`,
    `Max-Age=${maxAge}`,
    `Path=${COOKIE_OPTIONEN.path}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (COOKIE_OPTIONEN.secure) teile.push('Secure')
  return teile.join('; ')
}

export function tokenAusCookieHeader(header: string | null) {
  if (!header) return null
  for (const teil of header.split(';')) {
    const [name, ...wert] = teil.trim().split('=')
    if (name === SITZUNGS_COOKIE) {
      const token = decodeURIComponent(wert.join('='))
      return token || null
    }
  }
  return null
}
