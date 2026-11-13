# Deployment auf dem Hostinger-VPS

Research zu Issue #3 (Karte #1). Frage: Wie laufen TanStack Start (Bun) und PocketBase auf dem vorhandenen Hostinger-VPS mit Dokploy, inklusive Domain, TLS, Volumes, Backups, Updates, Ressourcen und Resend-DNS? Stand der Quellen: 13.11.2026.

Wo eine Aussage aus den eigenen Referenz-Repos stammt (`theaussie86/wa-website`, `theaussie86/onlineheldinnen-blog`), steht das dabei. Alles andere ist mit Primärquelle belegt. Schlüsse, die keine Quelle wörtlich trägt, sind als **Schluss** markiert.

## Empfehlung in Kürze

1. **Zwei getrennte Einheiten in Dokploy, kein gemeinsames Compose.**
   - Die App als Dokploy-**Application** (Swarm-Service) aus einem GHCR-Image, genau wie `wa-website`: Build in GitHub Actions, `sha-*`-Tag, `deploy.yml` setzt per Dokploy-API `dockerImage` und deployt.
   - PocketBase als Dokploy-**Compose** (Typ "Docker Compose", nicht "Stack") mit fest gepinnter Version und einem **benannten Volume** für `pb_data`, wie die vorhandene PocketBase-Instanz in `wa-website/pocketbase/docker-compose.yml`.
2. **Domain und TLS** über Traefik aus Dokploy: Domain-Tab der Application, Let's Encrypt. PocketBase nur dann mit eigener Subdomain, wenn der Browser direkt mit PocketBase spricht (entscheidet #2).
3. **Backups** mit der eingebauten Backup-Funktion von PocketBase, direkt in einen S3-kompatiblen Bucket außerhalb der VPS, täglich per Cron. Ein Rücksicherungstest gehört zur Abnahme.
4. **Resend** auf einer Subdomain (z. B. `mail.<club-domain>`), dazu DKIM, SPF/Return-Path, später DMARC auf der Hauptdomain.
5. **Ressourcen** sind bei rund 20 Nutzern kein Thema. Trotzdem Speicherlimits setzen, damit ein Fehler nicht die Nachbarn auf der VPS trifft.

## 1. Container-Setup

### Ein Compose oder zwei Dienste?

Zwei Dienste. Gründe:

- **Gleiches Muster wie die Nachbarn.** Auf der VPS läuft jede Website als Application aus GHCR, der Server baut nie, der Deploy kommt aus GitHub Actions per API (Quelle: `wa-website/.github/workflows/build-image.yml` und `deploy.yml`, ebenso `onlineheldinnen-blog`). Eine zweite Variante nur für dieses Projekt wäre zusätzlicher Pflegeaufwand.
- **Verschiedene Lebenszyklen.** Die App wird bei jedem Merge neu ausgerollt und ist zustandslos. PocketBase hält die Daten, wird selten und nur bewusst aktualisiert. Ein App-Deploy soll PocketBase nicht anfassen (so auch `wa-website/docs/betrieb.md`: "Ein Deploy der Webseite fasst PocketBase nicht an, und umgekehrt").
- **PocketBase gehört nicht in einen Rolling Update.** Die Applications auf der VPS rollen `start-first`, also läuft der neue Container, bevor der alte verschwindet (`wa-website/docs/betrieb.md`). PocketBase skaliert laut FAQ nur vertikal, auf einem einzigen Server ("Only on a single server, aka. vertical", https://pocketbase.io/faq/). **Schluss:** Zwei PocketBase-Prozesse gleichzeitig auf demselben `pb_data` sind zu vermeiden. Das Compose ohne Swarm ersetzt den Container einfach, ohne Überlappung.
- **Stack-Modus bringt nichts.** Dokploy unterscheidet "Docker Compose" und "Stack" (Swarm). Im Stack-Modus fehlen Compose-Features wie `build`, Labels gehören unter `deploy.labels` (https://docs.dokploy.com/docs/core/docker-compose, https://docs.dokploy.com/docs/core/docker-compose/domains).

### App: TanStack Start auf Bun

- TanStack Start mit Vite baut über Nitro. Für Bun ist je nach Aufruf `nitro({ preset: 'bun' })` in `vite.config.ts` nötig. Die Bun-spezifischen Hinweise gelten laut Doku nur mit React 19. Alternativ gibt es einen eigenen `server.ts` aus dem Beispiel-Repo, gestartet mit `bun run server.ts`. Port über `PORT`, Standard 3000 (https://tanstack.com/start/latest/docs/framework/react/guide/hosting).
- Basisimage laut Bun-Doku `oven/bun:1`, Produktionsabhängigkeiten mit `bun install --frozen-lockfile --production`, Laufzeit als Nutzer `bun` (https://bun.com/docs/guides/ecosystem/docker).
- Welcher der beiden Startwege (Nitro-Preset oder eigener Server) gilt, klärt #2. Für das Deployment ist nur wichtig: ein Image, ein Port, ein Health-Endpunkt (z. B. `/api/health`), damit der `start-first`-Rollout weiß, wann der neue Container gesund ist.
- Secrets (PocketBase-Token, Resend-API-Key) als Laufzeit-Variablen in Dokploy, nicht im Image und nicht in den GitHub-Secrets. So auch `wa-website/docs/betrieb.md`.

### PocketBase

- Es gibt **kein offizielles Docker-Image**. Die PocketBase-Doku zeigt ein minimales Dockerfile auf `alpine`, das das Release-Zip lädt, optional `pb_migrations` und `pb_hooks` hineinkopiert und `pb_data` als Volume erwartet (https://pocketbase.io/docs/going-to-production/).
- Die vorhandene Instanz nutzt das Community-Image `ghcr.io/muchobien/pocketbase` mit fester Version und mountet die Migrationen von einem Host-Pfad (`wa-website/pocketbase/docker-compose.yml`).
- **Empfehlung für dieses Projekt:** eigenes kleines PocketBase-Image nach dem Dockerfile der Doku, in GitHub Actions gebaut, mit `pb_migrations` (und ggf. `pb_hooks`) im Image. Vorteil gegenüber dem Host-Mount: Schema und Version reisen zusammen in einem Tag, kein separates Upload-Skript, kein absoluter Host-Pfad. Dokploy rät ohnehin von absoluten Host-Pfaden ab, weil sie bei Deployments aufgeräumt werden können (https://docs.dokploy.com/docs/core/docker-compose).
- Migrationen werden beim Start von `serve` automatisch angewendet. Das vorgefertigte Binary hat `--automigrate` standardmäßig an, Schemaänderungen im Dashboard erzeugen dann Migrationsdateien (https://pocketbase.io/docs/js-migrations/). **Schluss:** Schema nur lokal ändern, Migrationsdateien committen, in Produktion nicht im Dashboard am Schema arbeiten, sonst entstehen Dateien im Container, die nirgends versioniert sind.
- Einstellungen inklusive SMTP- und S3-Zugangsdaten liegen sonst als Klartext-JSON in der Datenbank. Verschlüsselung per `--encryptionEnv=PB_ENCRYPTION_KEY` mit einem zufälligen 32-Zeichen-Wert (https://pocketbase.io/docs/going-to-production/).

### Persistentes Volume für `pb_data`

- Benanntes Docker-Volume, kein Bind-Mount. Dokploy: benannte Volumes sind für Datenbanken gedacht und von "Volume Backups" erfasst, Bind-Mounts nicht (https://docs.dokploy.com/docs/core/docker-compose, https://docs.dokploy.com/docs/core/volume-backups).
- Das Volume als `external: true` mit festem Namen anlegen (z. B. `bruderschaft-pb-data`), wie bei der vorhandenen Instanz. Begründung dort: Wird die Compose-Anwendung im Panel gelöscht und neu angelegt, bleiben die Daten (`wa-website/docs/betrieb.md`).
- Da PocketBase im Compose (nicht im Swarm) läuft, betrifft die Swarm-Frage nur die App. Die App ist zustandslos und braucht kein Volume.

### Netz und Namen auf der geteilten VPS

- PocketBase tritt dem externen `dokploy-network` bei, damit der Swarm-Service der App ihn per Alias erreicht. Dokploy: geroutete Dienste müssen im `dokploy-network` sein (https://docs.dokploy.com/docs/core/docker-compose/domains). Das vorhandene Compose macht es genauso.
- **Achtung, Kollisionen:** Die vorhandene Instanz belegt den Alias `pocketbase` und den Host-Port `127.0.0.1:8090` (`wa-website/pocketbase/docker-compose.yml`). Die neue Instanz braucht einen eigenen Alias (z. B. `bruderschaft-pb`, App-Variable `POCKETBASE_URL=http://bruderschaft-pb:8090`) und, falls überhaupt ein Host-Port für den SSH-Tunnel gewünscht ist, einen anderen Loopback-Port.
- Dokploy empfiehlt `expose` statt `ports`, wenn ein Dienst nur im Container-Netz erreichbar sein soll (https://docs.dokploy.com/docs/core/docker-compose/domains).

## 2. Domain und TLS

- Domains hängen im Domain-Tab der Application bzw. der Compose-Anwendung. Dokploy erzeugt die Traefik-Labels selbst, HTTPS über Let's Encrypt (https://docs.dokploy.com/docs/core/docker-compose/domains).
- DNS: A-Record der Club-Domain (und ggf. `www`) auf die VPS. Bei welchem Anbieter die Club-Domain liegt, ist offen, die Einträge sind aber anbieterunabhängig.
- **Stolperfalle aus dem Betrieb der Nachbarn:** Traefik fordert Zertifikate nur beim Laden der Konfiguration an. Scheitert der erste Versuch, weil DNS noch nicht zeigt, versucht er es nicht von selbst erneut. Abhilfe dort: nach DNS-Änderung `dokploy-traefik` neu starten (`wa-website/docs/betrieb.md`). **Schluss:** DNS zuerst setzen, propagieren lassen (gegen einen öffentlichen Resolver prüfen), erst dann die Domain in Dokploy eintragen.
- **PocketBase öffentlich oder nicht?** Hängt an #2:
  - Spricht nur der TanStack-Server mit PocketBase (Server-Funktionen, Dateien über die App ausgeliefert): kein Router, keine Subdomain, PocketBase bleibt im internen Netz. Admin-UI per SSH-Tunnel wie bei der vorhandenen Instanz.
  - Spricht der Browser direkt mit PocketBase (SDK, Realtime, Datei-URLs): eigene Subdomain, z. B. `pb.<club-domain>`, im Domain-Tab der Compose-Anwendung. Dann in PocketBase "User IP proxy headers" auf `X-Forwarded-For` setzen, den eingebauten Rate-Limiter einschalten und Superuser auf bestimmte IPs beschränken (alles in Settings, https://pocketbase.io/docs/going-to-production/).

## 3. Backups

Zwei Wege stehen zur Wahl. Empfohlen ist der erste.

**A. Eingebaute PocketBase-Backups nach S3 (empfohlen)**

- Unter Dashboard > Settings > Backups, seit v0.16. Ein Backup ist ein ZIP-Snapshot von `pb_data` inklusive hochgeladener Dateien, ausgenommen lokale Backups und Dateien, die selbst schon in S3 liegen. Ablage lokal (Standard) oder in einem S3-kompatiblen Speicher, die Doku empfiehlt dafür einen eigenen Bucket (https://pocketbase.io/docs/going-to-production/).
- Konfiguration laut Quellcode: `cron` (leer = aus), `cronMaxKeep` (Pflicht, mindestens 1, sobald `cron` gesetzt ist) und ein eigener S3-Block mit `bucket`, `region`, `endpoint`, `accessKey`, `secret`, `forcePathStyle` (https://github.com/pocketbase/pocketbase/blob/master/core/settings_model.go).
- Seit v0.40.0 sperrt die Backup-Erzeugung die Datenbank nicht mehr per Transaktion (https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md). Die Doku warnt trotzdem, dass Backups die Leistung kurz drücken können, und empfiehlt erst ab etwa 5 GB eine andere Strategie (`sqlite3 .backup` plus `rsync`).
- Rücksicherung: über die Admin-UI oder `POST /api/backups/{key}/restore`, startet den PocketBase-Prozess neu. Download per Superuser-File-Token (https://pocketbase.io/docs/api-backups/).
- Vorschlag: täglich nachts, `cronMaxKeep` 14 bis 30. Hochgeladene Dateien (Protokolle, Archivfotos) lokal in `pb_data` lassen, nicht in S3, damit sie im Backup mitkommen.

**B. Dokploy Volume Backups**

- Sichert benannte Volumes von Applications und Compose-Anwendungen nach Cron in ein S3-Ziel. Empfohlen ist der Modus "Container OFF", weil ein laufender, schreibender SQLite-Dienst sonst inkonsistent gesichert werden kann. Restore nur in ein noch nicht vorhandenes, unbenutztes Volume (https://docs.dokploy.com/docs/core/volume-backups).
- Nachteil gegenüber A: kurze Auszeit pro Backup, und der Restore ist ein Eingriff auf Docker-Ebene statt eines Klicks in PocketBase. Taugt als zweite Ebene, ist aber nicht nötig.

**S3-kompatibler Speicher außerhalb der VPS**

- Dokploy führt als S3-Ziele AWS S3, Backblaze B2, Cloudflare R2 und Google Cloud Storage (https://github.com/Dokploy/website/tree/main/apps/docs/content/docs/core/(S3-Destinations)). PocketBase braucht nur Endpoint, Region, Bucket und Schlüssel, ist also ebenso anbieteroffen.
- Cloudflare R2: 10 GB-Monat Speicher im Free-Tier, kein Egress-Entgelt (https://developers.cloudflare.com/r2/pricing/). Für eine Club-App mit täglichen ZIPs reicht das voraussichtlich lange, hängt aber am Bildvolumen des Archivs (offener Punkt "Bilder" auf der Karte).
- Zugangsschlüssel nur mit Rechten auf genau diesen Bucket.

## 4. Updates

- **App:** jeder Merge auf `main` baut ein Image, `deploy.yml` setzt den Tag, Rollback durch erneuten Deploy eines älteren `sha-*`-Tags (Muster aus `wa-website`).
- **PocketBase:** Version fest pinnen, nie `latest`. PocketBase ist vor v1.0, volle Rückwärtskompatibilität ist nicht garantiert (https://github.com/pocketbase/pocketbase/blob/master/README.md). Der Changelog zu v0.40.0 rät ausdrücklich, Updates erst lokal zu testen und nicht blind in Produktion zu schieben (https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md).
- Ablauf: Changelog lesen, lokal mit einer Kopie des letzten Backups testen, manuelles Backup in Produktion, dann neuen Tag in der Compose-Datei setzen und deployen.
- Aktueller Stand zum Recherchezeitpunkt: Release v0.40.6 vom 23.10.2026 (https://github.com/pocketbase/pocketbase/releases). Das Dockerfile-Beispiel der Doku nennt eine andere Versionsnummer, also die Version immer aus den Releases nehmen, nicht aus dem Beispiel.
- Die vorhandene Instanz auf der VPS ist eine andere Version. Beide Instanzen sind unabhängig und müssen nicht synchron laufen.

## 5. Ressourcen

- Die PocketBase-FAQ nennt 10.000+ dauerhafte Realtime-Verbindungen auf einem kleinen VPS mit 2 vCPU und 4 GB RAM, ohne Optimierung (https://pocketbase.io/faq/). Bei rund 20 Mitgliedern auf einer VPS mit 4 vCPU und 16 GB ist Last kein Kriterium.
- Für TanStack Start auf Bun gibt es keine offizielle Größenangabe. **Schluss:** ein Bun-Prozess für eine kleine SSR-App liegt im Bereich von wenigen hundert MB, gemessen wird nach dem ersten Deploy mit `docker stats`.
- Trotzdem Grenzen setzen, weil die VPS geteilt ist:
  - PocketBase: `GOMEMLIMIT` als weiches Limit, z. B. `512MiB` (Beispielwert der Doku). Bei vielen Realtime-Verbindungen ggf. Dateideskriptor-Limit anheben (https://pocketbase.io/docs/going-to-production/).
  - App: Memory Limit in Dokploy unter Advanced > Resources. Achtung, Werte in Bytes, ohne Einheit (https://docs.dokploy.com/docs/core/applications/advanced).
  - Log-Rotation (`max-size`, `max-file`) wie im vorhandenen Compose.
- Wachstumstreiber ist nicht die Nutzerzahl, sondern der Speicher: Archivfotos und Protokolle in `pb_data` und deren Backups. Größenlimits und Bildoptimierung sind auf der Karte noch offen.

## 6. Resend: Domain und DNS

- Resend empfiehlt, von einer **Subdomain** zu senden, um die Absender-Reputation zu isolieren. Jede Subdomain wird in Resend als eigene Domain angelegt (https://resend.com/docs/dashboard/domains/introduction).
- Vorschlag: `mail.<club-domain>` als Sende-Domain, Absender z. B. `noreply@mail.<club-domain>`.
- Benötigte Einträge, exakte Werte immer aus dem Records-Tab der Domain in Resend kopieren (https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying):
  - **DKIM:** TXT unter `resend._domainkey.<sende-domain>`, Wert genau wie von Resend erzeugt.
  - **SPF / Return-Path:** bisher ein MX- und ein TXT-Eintrag auf der Subdomain `send.<sende-domain>`, MX zeigt auf einen Amazon-SES-Feedback-Host der gewählten Region (z. B. `eu-west-1`). Beide müssen stimmen, sonst verifiziert SPF nicht. Bei neu angelegten Domains zeigt Resend laut demselben Artikel teils CNAME-Einträge statt dessen. Ein CNAME verträgt keinen anderen Eintrag auf demselben Namen.
  - **DMARC** (empfohlen): TXT `_dmarc.<club-domain>` mit `v=DMARC1; p=none; rua=mailto:<postfach>;`. Erst wenn alle Absender `dmarc=pass` zeigen, auf `p=quarantine`, später `p=reject` verschärfen. Für Subdomains gibt es den Tag `sp` (https://resend.com/docs/dashboard/domains/dmarc). **Schluss:** Ein DMARC-Eintrag auf der Hauptdomain deckt die Sende-Subdomain mit ab, solange `sp` nicht anders gesetzt ist.
- Falle bei manchen DNS-Panels: der Anbieter hängt die eigene Domain an MX- oder CNAME-Werte an. Abhilfe ist ein Punkt am Ende des Werts (gleicher Artikel).
- Region in Resend bewusst wählen (EU), die MX-Werte hängen daran.
- Die Sende-Subdomain berührt keine bestehenden MX-Einträge der Hauptdomain, falls dort Postfächer laufen.

## 7. Offene Punkte für andere Tickets

- #2: Spricht der Browser direkt mit PocketBase? Entscheidet, ob PocketBase eine öffentliche Subdomain bekommt (Abschnitt 2).
- Karte "Bilder": Größenlimits und Optimierung bestimmen Backup-Größe und Speicherbedarf.
- #4: Bei welchem Anbieter liegt die Club-Domain, und wer setzt dort DNS?
- Wahl des S3-Anbieters und wer das Konto hält (Entwickler oder Club). Das ist auch eine Frage des Wartungsvertrags, der außerhalb der App-Spec liegt.

## Quellen

- PocketBase, Going to production: https://pocketbase.io/docs/going-to-production/
- PocketBase, FAQ: https://pocketbase.io/faq/
- PocketBase, JS-Migrationen: https://pocketbase.io/docs/js-migrations/
- PocketBase, Backups-API: https://pocketbase.io/docs/api-backups/
- PocketBase, Quellcode `core/settings_model.go`, `CHANGELOG.md`, `README.md`, Releases: https://github.com/pocketbase/pocketbase
- Dokploy, Docker Compose: https://docs.dokploy.com/docs/core/docker-compose
- Dokploy, Compose-Domains: https://docs.dokploy.com/docs/core/docker-compose/domains
- Dokploy, Volume Backups: https://docs.dokploy.com/docs/core/volume-backups
- Dokploy, Application Advanced: https://docs.dokploy.com/docs/core/applications/advanced
- Dokploy, S3-Ziele (Doku-Quellen): https://github.com/Dokploy/website/tree/main/apps/docs/content/docs/core/(S3-Destinations)
- TanStack Start, Hosting: https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- Bun, Docker: https://bun.com/docs/guides/ecosystem/docker
- Resend, Domains: https://resend.com/docs/dashboard/domains/introduction
- Resend, Domain verifiziert nicht: https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying
- Resend, DMARC: https://resend.com/docs/dashboard/domains/dmarc
- Cloudflare R2, Preise: https://developers.cloudflare.com/r2/pricing/
- Referenz-Repos (Muster der VPS): `theaussie86/wa-website` (`.github/workflows/`, `docs/betrieb.md`, `pocketbase/docker-compose.yml`), `theaussie86/onlineheldinnen-blog` (`.github/workflows/`)
