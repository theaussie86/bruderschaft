# Ein generischer Proxy `/pb/*` zu PocketBase

Der Browser spricht PocketBase ausschließlich über einen generischen Proxy `/pb/*` im Server von TanStack Start an. Der Proxy liest das PocketBase-Token aus dem httpOnly-Cookie und setzt es als `Authorization`-Header, holt für geschützte Dateien den File-Token und sperrt das Admin-UI (`/_/`) und die Superuser-API (`/api/_superusers`). Das PocketBase-SDK im Browser läuft mit `baseUrl = "/pb"`, das Token sieht JavaScript nie. PocketBase selbst bleibt intern und hat keine öffentliche Subdomain. Server Functions gibt es nur noch für das Laden beim Server-Rendering und für die Sammelbestellung.

## Considered Options

- **Eine Server Function pro Operation** (Auftrag speichern, Bild hochladen, Termin anlegen ...): Verworfen. Weil alle Fachregeln in PocketBase liegen (ADR 0002), hätte keine dieser Funktionen eigene Logik. Es wären dutzende Durchreicher, die bei jeder neuen Collection mitwachsen.
- **PocketBase öffentlich unter eigener Subdomain, Token im Browser**: Verworfen. Das Token läge im `localStorage` statt im httpOnly-Cookie, und das Admin-UI wäre aus dem Internet erreichbar.

## Consequences

- Der Proxy ist die einzige Stelle, an der Cookie, Token und Sperrliste behandelt werden. Fehler dort betreffen alle Zugriffe, deshalb bekommt er eigene Tests gegen ein echtes PocketBase.
- Uploads laufen durch den Proxy. Er muss Multipart-Bodies durchreichen, ohne sie zu puffern.
- Dateiantworten bekommen `Cache-Control: private, max-age=31536000, immutable`, weil PocketBase-Dateinamen eindeutig sind.
- Realtime (SSE) wird nicht gebraucht. Kommt es dazu, muss der Proxy Streams durchreichen.
- Die Proxy-Route für Dateien aus der Research zu Integration ist damit ein Teil dieses Proxys, keine eigene Route.
