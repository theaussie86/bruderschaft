import { abmeldeCookie, sitzungsCookie, tokenAusCookieHeader } from './sitzung'

// Der generische Proxy /pb/* zu PocketBase (ADR 0003). Einzige Stelle, an der
// Cookie, Token und Sperrliste behandelt werden.

export const PROXY_PREFIX = '/pb'

// Die Collection `_superusers` hat in jeder PocketBase-Instanz diese feste ID.
const SUPERUSER_COLLECTION_ID = 'pbc_3142635823'

// Endpunkte unter /api/collections/<name>/, nach denen ein Login das Token
// in der Antwort trägt.
const AUTH_ENDPUNKTE = new Set(['auth-with-password', 'auth-refresh'])

// Anfrage-Header, die nicht an PocketBase gehen: Cookies und eigene Tokens des
// Browsers zählen nicht, nur das Cookie der Sitzung. accept-encoding fällt weg,
// damit PocketBase unkomprimiert antwortet und die Header zur Antwort passen.
const ANFRAGE_HEADER_WEG = [
  'host',
  'cookie',
  'authorization',
  'connection',
  'content-length',
  'accept-encoding',
]
// PocketBase-Dateinamen sind eindeutig, eine Datei ändert sich nie (ADR 0003).
export const DATEI_CACHE = 'private, max-age=31536000, immutable'

const ANTWORT_HEADER_WEG = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'set-cookie',
  'connection',
]

export async function pbProxy(
  request: Request,
  pocketbaseUrl: string,
): Promise<Response> {
  const url = new URL(request.url)
  const pfad = url.pathname.slice(PROXY_PREFIX.length) || '/'

  if (pfad === '/abmelden') {
    if (request.method !== 'POST') return nichtGefunden()
    return new Response(null, {
      status: 204,
      headers: { 'set-cookie': abmeldeCookie() },
    })
  }

  const ziel = erlaubterPfad(pfad)
  if (!ziel) return nichtGefunden()

  const headers = new Headers(request.headers)
  for (const name of ANFRAGE_HEADER_WEG) headers.delete(name)
  const token = tokenAusCookieHeader(request.headers.get('cookie'))
  if (token) headers.set('authorization', token)

  // Geschützte Dateien liefert PocketBase nur mit File-Token in der URL. Der
  // Proxy holt ihn mit dem Token aus dem Cookie, der Browser sieht ihn nie.
  const zielSuche = new URLSearchParams(url.search)
  zielSuche.delete('token')
  if (ziel.datei && token && request.method === 'GET') {
    const dateiToken = await holeDateiToken(pocketbaseUrl, token)
    if (dateiToken) zielSuche.set('token', dateiToken)
  }
  const suche = zielSuche.size > 0 ? `?${zielSuche}` : ''

  const hatBody =
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.body !== null
  const antwort = await fetch(`${pocketbaseUrl}${pfad}${suche}`, {
    method: request.method,
    headers,
    // Uploads als Stream durchreichen, ohne sie im Speicher zu puffern.
    body: hatBody ? request.body : undefined,
    duplex: 'half',
    redirect: 'manual',
  } as RequestInit)

  const antwortHeader = new Headers(antwort.headers)
  for (const name of ANTWORT_HEADER_WEG) antwortHeader.delete(name)

  if (ziel.datei && antwort.ok) antwortHeader.set('cache-control', DATEI_CACHE)

  if (ziel.authEndpunkt && antwort.ok) {
    const { token: neuesToken, ...rest } = (await antwort.json()) as {
      token?: string
    }
    if (neuesToken) antwortHeader.set('set-cookie', sitzungsCookie(neuesToken))
    return Response.json(rest, {
      status: antwort.status,
      headers: antwortHeader,
    })
  }

  // Das fetch von Node (undici) bricht den Body ab, sobald das Response-Objekt
  // `antwort` eingesammelt wird, außer der Stream ist gesperrt. Ohne pipeThrough
  // wäre der Body nach einem Garbage-Collector-Lauf schon "gelesen" (Issue #41).
  // pipeThrough sperrt ihn und reicht weiter als Stream durch.
  return new Response(antwort.body?.pipeThrough(new TransformStream()), {
    status: antwort.status,
    statusText: antwort.statusText,
    headers: antwortHeader,
  })
}

// Positivliste statt Sperrliste: Nur Datensätze, Auth-Aktionen, Dateien,
// eigene Hook-Routen und Health sind erreichbar. Damit fallen Admin-UI (/_/), Superuser-API,
// Einstellungen, Backups, Logs und die Collection-Verwaltung heraus.
type Ziel = { authEndpunkt: boolean; datei: boolean }

function erlaubterPfad(pfad: string): Ziel | null {
  const segmente = pfad.split('/').slice(1)
  let dekodiert: Array<string>
  try {
    dekodiert = segmente.map((s) => decodeURIComponent(s))
  } catch {
    return null
  }
  if (dekodiert.some((s) => s.includes('/') || s.includes('\\'))) return null

  const [api, bereich, name, aktion] = dekodiert
  if (api !== 'api') return null

  const normal = { authEndpunkt: false, datei: false }
  if (bereich === 'health' && dekodiert.length === 2) return normal
  // Dateien: /api/files/<collection>/<datensatz>/<dateiname>
  if (bereich === 'files' && name && !systemCollection(name))
    return { authEndpunkt: false, datei: dekodiert.length === 5 }
  // Eigene Hook-Routen der App (pocketbase/pb_hooks) liegen unter /api/club/.
  if (bereich === 'club' && name) return normal

  if (bereich === 'collections' && name && aktion) {
    if (systemCollection(name)) return null
    return {
      authEndpunkt: dekodiert.length === 4 && AUTH_ENDPUNKTE.has(aktion),
      datei: false,
    }
  }
  return null
}

async function holeDateiToken(pocketbaseUrl: string, token: string) {
  const res = await fetch(`${pocketbaseUrl}/api/files/token`, {
    method: 'POST',
    headers: { authorization: token },
  })
  if (!res.ok) return null
  const { token: dateiToken } = (await res.json()) as { token?: string }
  return dateiToken ?? null
}

function systemCollection(name: string) {
  return name.startsWith('_') || name.toLowerCase() === SUPERUSER_COLLECTION_ID
}

function nichtGefunden() {
  return Response.json(
    { status: 404, message: 'Nicht gefunden.' },
    { status: 404 },
  )
}
