# TanStack Start, PocketBase und Bun zusammen

Research zu Ticket #2 (Karte #1). Stand: 13.11.2026. Begriffe wie Mitglied, Admin, Protokoll siehe `GLOSSARY.md`.

## Kurzfassung

- **Versionen:** PocketBase v0.42.2 (11.11.2026), JS-SDK `pocketbase` 0.29.0 (npm, 11.11.2026), `@tanstack/react-start` 1.169.x, Bun 1.4.4. TanStack Start bezeichnet sich als stabil.
- **Wichtig:** PocketBase ist ab v0.41 von GitHub weggezogen. Die GitHub-Repos sind archiviert, neue Releases gibt es nur noch auf `ganigeorgiev.com/pocketbase/*`. Wer 0.39.x betreibt, aktualisiert per `./pocketbase update` (ab 0.40.6 holt das vom neuen Host).
- **Auth:** PocketBase-Token in einem eigenen `httpOnly`-Cookie der App. Pro Request eine neue PocketBase-Instanz in Server Functions, Token laden, `authRefresh()`, bei Fehler Cookie löschen. PocketBase selbst bleibt hinter der App, der Browser spricht nie direkt mit ihr.
- **Einladung:** Admin legt das Mitglied mit Zufallspasswort an, ein `pb_hooks`-Hook verschickt die Passwort-Reset-Mail als Einladungsmail. `verified = false` ist das Merkmal "eingeladen, noch nicht aktiv", denn `confirm-password-reset` setzt `verified` automatisch auf `true`. Kein eigener Token-Mechanismus nötig.
- **Passwort-Reset:** Standard-Endpunkte `request-password-reset` und `confirm-password-reset`, Link führt auf eine eigene Route der App statt ins PocketBase-Dashboard.
- **Dateien:** File-Felder als *Protected* markieren, View-Rule auf Mitglieder. Ausgeliefert über eine Server Route der App, die die Session prüft, serverseitig ein File-Token holt und die Datei von PocketBase durchreicht. Stabile URLs, kein Token-Ablauf im Browser.
- **SMTP über Resend:** `smtp.resend.com`, Port 465 mit TLS an (oder 587 mit TLS aus), Benutzer `resend`, Passwort = Resend-API-Key. Absenderdomain bei Resend verifizieren, am besten eine Subdomain.
- **Bun in Produktion:** Funktioniert, mit drei Stolpersteinen: React 19 Pflicht, `bunfig.toml` mit `linker = "hoisted"`, und `vite dev` läuft ohne `--bun` unter Node.

## 1. Versionen und Projektstatus

| Komponente | Aktuell | Quelle |
|---|---|---|
| PocketBase | v0.42.2 (11.11.2026) | Release-Feed `https://ganigeorgiev.com/meta/pocketbase/pocketbase/releases.atom?channel=default` |
| PocketBase JS-SDK | 0.29.0 (11.11.2026) | `npm view pocketbase` |
| TanStack Start | `@tanstack/react-start` 1.169.5 (08.11.2026) | https://github.com/TanStack/router/releases |
| Bun | 1.4.4 (22.10.2026) | https://github.com/oven-sh/bun/releases |

**PocketBase-Umzug.** Laut Discussion #7841 hat der Maintainer am 12.09.2026 angekündigt, GitHub zu verlassen; am 26.10.2026 ist der neue Host live, GitHub ist archiviert, neue Releases kommen "ONLY on the new host" (https://github.com/pocketbase/pocketbase/discussions/7841). Das README des GitHub-Repos verweist auf `https://ganigeorgiev.com/pocketbase/pocketbase`. Das JS-SDK-Repo auf GitHub ist ebenfalls archiviert, das npm-Paket wird aber weiter veröffentlicht (0.28.2 am 01.11., 0.29.0 am 11.11.).

Folgen für dieses Projekt:
- Releases und Changelog über den Atom-Feed oben verfolgen, nicht über GitHub Watch.
- Für den Docker- oder VPS-Download gibt es eine stabile URL: `https://ganigeorgiev.com/meta/pocketbase/pocketbase/download/{releaseTag}/{filename}` (Release-Notes v0.41.0).
- Der Go-Modulpfad ist jetzt `ganigeorgiev.com/pocketbase`. Betrifft uns nur, wenn wir PocketBase in Go erweitern. Empfehlung: nicht tun, JS-Hooks (`pb_hooks`) reichen.

**Upgrade von 0.39.x.** Relevante Punkte aus den Release-Notes:
- v0.40.0: Mindest-Go 1.27 und `encoding/json/v2`, laut Maintainer "not fully backward compatible", vor dem Produktiv-Update lokal testen. Betrifft vor allem Go-Erweiterungen. Dazu `Cross-Origin-Opener-Policy: same-origin` als Default-Header.
- v0.40.6: `./pocketbase update` lädt ab dann vom neuen Host. Neue Grenze für Thumbnail-Quellbilder (`PB_THUMBS_MAX_SOURCE_PIXELS`), weil Thumbnails "one of the main culprit for potential OOMs" bleiben.
- v0.42.0: Neue globale Middleware lehnt unbekannte oder abgelaufene `Authorization`-Token mit 401 ab, auch auf Endpunkten, die vorher anonym antworteten. Für SSR heißt das: ein abgelaufenes Token im Cookie nicht blind mitschicken, sondern vorher refreshen oder verwerfen (siehe Abschnitt 2). v0.42.1 behebt eine Regression daraus.

## 2. Auth mit Session im Cookie (SSR)

**Was PocketBase vorgibt.** Es gibt kein Logout-Endpoint, der Client verwirft einfach das Token (https://pocketbase.io/docs/authentication/). Token prüft und verlängert man mit `authRefresh()`, das "a new token with refreshed `exp` claim and the latest user data" liefert. Auth-Token sind per Default 5 Tage gültig (`AuthToken.Duration: 432000` in `core/collection_model_auth_options.go`), pro Collection einstellbar.

**Was das JS-SDK vorgibt.** Für SSR empfiehlt das README: pro Server-Request eine neue `PocketBase`-Instanz, `authStore` aus dem Cookie laden, Aktion ausführen, Cookie aktualisieren. Alle Framework-Beispiele rufen `authRefresh()` auf, wenn `isValid` true ist, und leeren den Store bei Fehler (https://github.com/pocketbase/js-sdk, Abschnitt SSR). `exportToCookie()` setzt per Default `secure`, `sameSite`, `httpOnly` auf true und lässt den Record weg, wenn der Cookie über 4096 Byte käme (`src/stores/BaseAuthStore.ts`).

**Was TanStack Start vorgibt.** Start hat keine eigene Session-API. Der offizielle Auth-Guide nutzt `getCookie`/`setCookie` aus `@tanstack/react-start/server` mit `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` in Produktion, lädt den User im `beforeLoad` der Root-Route, schützt Seiten über eine `_authed`-Layout-Route und setzt `Cache-Control: private, no-store` (https://tanstack.com/start/latest/docs/framework/react/guide/authentication). Ausdrücklich: `beforeLoad` ist nur UX, jede Server Function mit privaten Daten muss selbst autorisieren (ebenda und https://tanstack.com/start/latest/docs/framework/react/guide/server-functions).

**Empfohlenes Muster.**
1. Login-Server-Function: `pb.collection('users').authWithPassword(email, pw)`, dann nur das Token in ein eigenes Cookie schreiben (`setCookie('session', pb.authStore.token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge })`). Den Record nicht ins Cookie legen, er kommt bei jedem Refresh frisch.
2. Helfer `pbFromRequest()`: neue Instanz, `pb.authStore.save(getCookie('session'))`. Ist `isValid` false, Cookie löschen und anonym weitermachen (wegen v0.42.0 kein abgelaufenes Token an PocketBase schicken).
3. Root-`beforeLoad` ruft eine Server Function `getCurrentUser`, die `authRefresh()` macht, das neue Token zurück ins Cookie schreibt (Sliding Session) und den User mit Admin-Recht zurückgibt. Bei 401 Cookie löschen.
4. Jede Server Function, die Daten liest oder schreibt, nutzt `pbFromRequest()`. Die Zugriffsregeln liegen damit in den PocketBase-API-Rules (`@request.auth.id != ""` für Mitglieder, `@request.auth.admin = true` für das Admin-Recht), nicht im TypeScript-Code. Kein Superuser-Token in der App.
5. Logout: Cookie löschen. Optional serverseitig alle Sitzungen beenden, indem man den `tokenKey` erneuert (passiert automatisch bei Passwortänderung, siehe Abschnitt 4).

Bei rund 20 Mitgliedern ist ein `authRefresh` pro Seitenaufruf unkritisch. Ein eigenes Session-Secret oder iron-session braucht es nicht, das PocketBase-Token ist bereits signiert und serverseitig widerrufbar.

**Rate-Limits und Proxy.** Alle Requests an PocketBase kommen von der App, also von einer IP. Die eingebauten Rate-Limits sind per Default aus (`RateLimits.Enabled: false`, Regel `*:auth` wäre 2 Requests pro 3 Sekunden, `core/settings_model.go`). Wer sie einschaltet, muss die Client-IP per Header durchreichen und `TrustedProxy` konfigurieren, sonst sperren sich alle Mitglieder gegenseitig.

## 3. Einladungs-Flow

PocketBase hat keine Einladung. Bausteine, die es gibt (Quellcode v0.40.x, Endpunkte laut https://pocketbase.io/docs/api-records/):
- Beim Anlegen eines Auth-Records ist `password` Pflicht.
- `confirm-password-reset` setzt das Passwort, invalidiert alle bisherigen Tokens des Records und markiert ihn als verifiziert, "if not already" (Doku) bzw. nur wenn die E-Mail seit dem Token unverändert ist (`apis/record_auth_password_reset_confirm.go`).
- Reset-Token sind an `tokenKey` gebunden (`core/record_tokens.go`). Der `tokenKey` wird beim Passwortwechsel neu erzeugt, damit ist ein Reset-Link faktisch einmalig.
- Gültigkeit Reset-Token: Default 30 Minuten, pro Collection einstellbar (`PasswordResetToken.Duration: 1800`). Verifikations-Token: 1 Tag.
- `request-password-reset` antwortet immer 204 und verschickt die Mail im Hintergrund ("fire and forget"); Fehler landen nur im PocketBase-Log. Pro Record gibt es eine Sperre von 2 Minuten für erneutes Senden (`apis/record_auth_password_reset_request.go`).
- In JS-Hooks gibt es `$mails.sendRecordPasswordReset(app, record)` (synchron, wirft Fehler) und den Hook `onMailerRecordPasswordResetSend` mit `e.message`, `e.record`, `e.meta.token` (https://pocketbase.io/docs/js-event-hooks/, `plugins/jsvm/binds.go`).
- Platzhalter in Mail-Templates: `{APP_NAME}`, `{APP_URL}`, `{TOKEN}` (`core/collection_model_auth_templates.go`). Das Default-Template verlinkt auf `{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}`, also ins PocketBase-Dashboard. Muss umgebogen werden.

**Bewertung der Optionen.**

| Variante | Aufwand | Haken |
|---|---|---|
| A: Reset-Mail als Einladung, unterschieden über `verified = false` | ein Hook, eine Seite `/passwort-setzen/$token` | Reset- und Einladungslink teilen sich eine Gültigkeitsdauer |
| B: Verifikations-Mail | | setzt kein Passwort, Mitglied bräuchte danach trotzdem einen Reset. Verworfen |
| C: Eigene Collection `einladungen` plus eigene Route in `pb_hooks` | eigener Token, eigene Ablaufzeit, eigene Route | mehr Code, eigene Sicherheitslogik. Nur nötig, wenn A nicht reicht |

**Empfehlung: Variante A.**
1. Admin legt in der App ein Mitglied an (Server Function mit dem Token des Admins, `createRule` erlaubt das nur mit Admin-Recht). Die Server Function setzt ein zufälliges Passwort (kryptografisch, 30+ Zeichen, niemand kennt es) und lässt `verified` auf false.
2. `pb_hooks`: `onRecordAfterCreateSuccess` für `users` ruft `$mails.sendRecordPasswordReset(e.app, e.record)` synchron auf, damit ein Versandfehler beim Admin ankommt statt nur im Log.
3. `pb_hooks`: `onMailerRecordPasswordResetSend` prüft `e.record.verified()`. Bei false: Betreff und HTML der Einladung, Link `{appURL}/einladung/{e.meta.token}`. Bei true: normaler Reset-Text, Link `{appURL}/passwort-setzen/{token}`. Texte im Hook-Code, versioniert, nicht im Dashboard.
4. Beide Links landen auf einer Seite der App, die `confirmPasswordReset(token, pw, pw)` aufruft und danach direkt einloggt.
5. Reset-Token-Dauer der Collection auf z.B. 72 Stunden setzen, damit Mitglieder die Einladung nicht in 30 Minuten annehmen müssen. Der Link bleibt trotzdem einmalig. Admin bekommt "Einladung erneut senden" (ruft dieselbe Funktion, 2-Minuten-Sperre beachten).
6. Merkmal für die Mitgliederliste: `verified = false` heißt "eingeladen, noch nicht aktiv".

`settings.meta.appURL` muss auf die App-URL zeigen, nicht auf PocketBase.

## 4. Passwort-Reset

Standardweg ohne Sonderbau:
- Seite "Passwort vergessen" ruft `requestPasswordReset(email)`. Antwortet immer gleich (Schutz gegen Enumeration, siehe Quellcode oben).
- Mail kommt aus demselben Hook wie in Abschnitt 3, Zweig `verified = true`.
- `confirmPasswordReset` setzt das neue Passwort und invalidiert alle alten Tokens, also auch Sitzungen auf anderen Geräten (https://pocketbase.io/docs/api-records/). Ab v0.42.0 fallen solche Sitzungen beim nächsten Request mit 401 heraus, die App löscht dann das Cookie (Abschnitt 2, Schritt 3).

## 5. Datei-Uploads mit Zugriffsschutz

**PocketBase.** File-Felder lassen sich als *Protected* markieren. Zugriff nur mit kurzlebigem File-Token und nur, wenn der Request die View-Rule der Collection erfüllt (https://pocketbase.io/docs/files-handling/). File-Token: `pb.files.getToken()`, Default 3 Minuten (`FileToken.Duration: 180`), pro Collection einstellbar. Der Token wird ausschließlich als Query-Parameter `?token=` gelesen, nicht aus dem `Authorization`-Header (`apis/file.go`). Thumbnails per `?thumb=WxH` nur für jpg, png, gif und teilweise webp, bei PDFs kommt das Original. Default-Limit pro Datei ca. 5 MB, pro Feld einstellbar; das Body-Limit der Record-Endpunkte richtet sich nach den File-Feldern der Collection (`apis/middlewares_body_limit.go`).

**Empfehlung: Proxy-Route in der App.**
- Server Route `/dateien/$collection/$recordId/$filename` (Server Routes: https://tanstack.com/start/latest/docs/framework/react/guide/server-routes). Ablauf: Session aus Cookie, `pb.files.getToken()` mit dem Mitglieds-Token, Datei von PocketBase holen, Body als Stream durchreichen, `Cache-Control: private` setzen. `?thumb=` durchreichen.
- Vorteile: stabile URLs in Galerien und Protokollen, kein Ablauf nach 3 Minuten in offenen Tabs, PocketBase muss nicht öffentlich erreichbar sein, die View-Rule in PocketBase bleibt die einzige Zugriffsregel.
- Uploads laufen über eine POST-Server-Function mit `FormData` (laut Doku nur bei POST erlaubt), die die Datei mit dem Token des Admins an `pb.collection(...).create/update` weitergibt.
- Alternative ohne Proxy: File-Token beim Rendern erzeugen und in die URLs schreiben, File-Token-Dauer hochsetzen. Einfacher, aber PocketBase muss öffentlich sein und Links laufen ab.

Für das offene Kartenthema "Bilder: Größenlimits, Optimierung" relevant: Thumbnails sind laut Release-Notes v0.40.6 der Hauptgrund für Speicherspitzen. Bilder beim Upload in der App verkleinern ist sinnvoller als große Originale plus PocketBase-Thumbs.

## 6. PocketBase-SMTP über Resend

Resend SMTP (https://resend.com/docs/send-with-smtp): Host `smtp.resend.com`, Benutzer `resend`, Passwort = API-Key. Ports 465/2465 mit implizitem TLS, 25/587/2587 mit STARTTLS.

PocketBase (`core/settings_model.go`, `SMTPConfig`): `tls: true` erzwingt TLS ab Verbindungsbeginn, `tls: false` schickt STARTTLS und überlässt dem Server das Upgrade. Daraus:
- **Port 465, TLS an**, Benutzer `resend`, Passwort API-Key, Auth-Methode PLAIN.
- Absender unter `settings.meta.senderAddress` / `senderName`.
- Resend verlangt eine eigene verifizierte Domain und empfiehlt eine Subdomain für den Versand (https://resend.com/docs/dashboard/domains/introduction).

Damit gehen alle Mails (Einladung, Reset) über PocketBase. Die App braucht kein eigenes Resend-SDK, solange keine weiteren Mails anstehen. Für spätere Mails (z.B. Erinnerung zum Bestelldatum) ebenfalls `$app.newMailClient()` in `pb_hooks` nutzen (https://pocketbase.io/docs/js-sending-emails/), dann gibt es nur einen Versandweg.

## 7. TanStack Start auf Bun in Produktion

**Status.** Die Doku sagt "TanStack Start is stable" (https://tanstack.com/start/latest/docs/framework/react/overview). Bun ist ein offiziell dokumentiertes Hosting-Ziel (https://tanstack.com/start/latest/docs/framework/react/guide/hosting), mit gepflegtem Beispiel `examples/react/start-bun` im Router-Repo (aktuell `@tanstack/react-start` ^1.169.6, Vite 8, React 19).

**Zwei Wege laut Hosting-Guide.**
- Nitro mit Preset `bun` (`nitro({ preset: 'bun' })`). Der Guide nennt das `nitro/vite`-Plugin "still under active development".
- Eigene `server.ts` aus dem Beispiel, Start mit `bun run server.ts` nach `vite build`. Liefert statische Dateien selbst aus (kleine aus dem Speicher, große on demand, ETag, Gzip), `PORT` Default 3000. Der Guide nennt sie einen Startpunkt.

Empfehlung: `server.ts` aus dem Beispiel, ohne Nitro. Weniger bewegliche Teile, und mehrere der bekannten Bun-Probleme (z.B. #8139, früher #3475, #2180) hingen am Nitro-Build.

**Stolpersteine.**
- **React 19 Pflicht:** "the Bun specific deployment guidelines only work with React 19" (Hosting-Guide).
- **Isolated Linker:** Bun installiert neue Workspace-Projekte per Default isoliert (https://bun.com/docs/pm/isolated-installs). Mit symlinked `node_modules` erzeugt der Start/Nitro-SSR-Build einen Crash zur Laufzeit (oven-sh/bun#39963, weitergereicht an TanStack/router#8139, offen, zuletzt aktiv 04.11.2026). Workaround von Bun-Seite: `bunfig.toml` mit `[install] linker = "hoisted"`. Bei einem Einzelprojekt ohne Workspaces ist hoisted ohnehin Default, die Zeile trotzdem setzen.
- **Bun im Dev nur mit `--bun`:** Das Beispiel startet `vite dev`. `bun run` respektiert die Node-Shebang von Vite und startet es unter Node, erst `bun --bun run dev` erzwingt Bun (https://bun.com/docs/cli/run). Wer "Bun in dev und prod" will, braucht das Flag. Ältere Bugs mit `--bun` im Dev (z.B. doppelter `Transfer-Encoding`, TanStack/router#6050) sind geschlossen.
- **Doppelte `Set-Cookie`-Header:** TanStack/router#7189 (geschlossen): Unter Bun auf Linux ging von zwei `Set-Cookie`-Headern einer verloren, Ursache war Buns `node:http`-Kompatibilität im Vite-Dev-Pfad. Unser Muster setzt nur ein Cookie, deshalb unkritisch. Trotzdem nicht mehrere Cookies in einer Antwort setzen.
- Sonst keine offenen Bun-spezifischen Issues im Router-Repo außer #7079 (Monorepo-Sonderfall).

## Offene Punkte für die Spec

- Reset-Token-Dauer festlegen (Vorschlag 72 h) und ob ein eigenes Einladungs-Token (Variante C) doch nötig ist.
- Feldname für das Admin-Recht in der `users`-Collection (Datenmodell-Ticket).
- Body-Limit von `Bun.serve` für große PDF-Uploads prüfen; die Bun-Doku nennt keinen Default.
- PocketBase nur intern erreichbar (localhost oder internes Netz) oder Dashboard auf eigener Subdomain für Entwickler-Support: Hosting-Ticket.

## Quellen

- PocketBase Doku: https://pocketbase.io/docs/authentication/, https://pocketbase.io/docs/api-records/, https://pocketbase.io/docs/files-handling/, https://pocketbase.io/docs/js-sending-emails/, https://pocketbase.io/docs/js-event-hooks/
- PocketBase Quellcode (GitHub-Stand v0.40.x, archiviert): `core/collection_model_auth_options.go`, `core/record_tokens.go`, `core/record_model_auth.go`, `core/collection_model_auth_templates.go`, `core/settings_model.go`, `apis/file.go`, `apis/record_auth_password_reset_request.go`, `apis/record_auth_password_reset_confirm.go`, `apis/middlewares_body_limit.go`, `plugins/jsvm/binds.go`, https://github.com/pocketbase/pocketbase
- PocketBase Umzug: https://github.com/pocketbase/pocketbase/discussions/7841, Release-Feed https://ganigeorgiev.com/meta/pocketbase/pocketbase/releases.atom?channel=default
- PocketBase JS-SDK: https://github.com/pocketbase/js-sdk (README SSR, `src/stores/BaseAuthStore.ts`)
- TanStack Start: https://tanstack.com/start/latest/docs/framework/react/overview, .../guide/hosting, .../guide/authentication, .../guide/server-functions, .../guide/server-routes, Beispiel https://github.com/TanStack/router/tree/main/examples/react/start-bun
- Issues: TanStack/router#7189, #8139, #6050, #7079; oven-sh/bun#39963
- Bun: https://bun.com/docs/cli/run, https://bun.com/docs/pm/isolated-installs
- Resend: https://resend.com/docs/send-with-smtp, https://resend.com/docs/dashboard/domains/introduction
