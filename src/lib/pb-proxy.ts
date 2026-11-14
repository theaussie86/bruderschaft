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

  const hatBody =
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.body !== null
  const antwort = await fetch(`${pocketbaseUrl}${pfad}${url.search}`, {
    method: request.method,
    headers,
    // Uploads als Stream durchreichen, ohne sie im Speicher zu puffern.
    body: hatBody ? request.body : undefined,
    duplex: 'half',
    redirect: 'manual',
  } as RequestInit)

  const antwortHeader = new Headers(antwort.headers)
  for (const name of ANTWORT_HEADER_WEG) antwortHeader.delete(name)

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

  return new Response(antwort.body, {
    status: antwort.status,
    statusText: antwort.statusText,
    headers: antwortHeader,
  })
}

// Positivliste statt Sperrliste: Nur Datensätze, Auth-Aktionen, Dateien,
// eigene Hook-Routen und Health sind erreichbar. Damit fallen Admin-UI (/_/), Superuser-API,
// Einstellungen, Backups, Logs und die Collection-Verwaltung heraus.
function erlaubterPfad(pfad: string): { authEndpunkt: boolean } | null {
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

  if (bereich === 'health' && dekodiert.length === 2)
    return { authEndpunkt: false }
  if (bereich === 'files' && name && !systemCollection(name))
    return { authEndpunkt: false }
  // Eigene Hook-Routen der App (pocketbase/pb_hooks) liegen unter /api/club/.
  if (bereich === 'club' && name) return { authEndpunkt: false }

  if (bereich === 'collections' && name && aktion) {
    if (systemCollection(name)) return null
    return {
      authEndpunkt: dekodiert.length === 4 && AUTH_ENDPUNKTE.has(aktion),
    }
  }
  return null
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
