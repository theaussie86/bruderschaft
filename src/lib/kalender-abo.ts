// Das Kalender-Abo (Spec #17): Kalender-Apps rufen /kalender-abo/<token>.ics
// ohne Anmeldung ab. Die App reicht den Token an die Hook-Route in PocketBase
// durch, die ihn prüft und den iCal-Feed erzeugt (ADR 0002).

const TOKEN = /^(\w+)\.ics$/

export async function kalenderAboAbrufen(
  datei: string,
  pocketbaseUrl: string,
): Promise<Response> {
  const token = TOKEN.exec(datei)?.[1]
  if (!token) return new Response('Nicht gefunden.', { status: 404 })

  const antwort = await fetch(`${pocketbaseUrl}/api/club/kalender-abo/${token}`)
  if (!antwort.ok) return new Response('Nicht gefunden.', { status: 404 })
  return new Response(antwort.body, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

// Der Link, den Mitglieder in ihren Kalender eintragen.
export function aboLink(origin: string, token: string) {
  return `${origin}/kalender-abo/${token}.ics`
}
