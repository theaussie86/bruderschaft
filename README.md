# Hahna Brothers

Mitglieder-App der Bruderschaft: Bestellrunden für Brotherhood-Kleidung, Kalender mit vergangenen Terminen. Begriffe stehen in [GLOSSARY.md](GLOSSARY.md), Entscheidungen in [docs/adr/](docs/adr/).

## Lokal entwickeln

```bash
bun install
bun run dev:pb   # PocketBase auf :8090, mit pocketbase/pb_migrations und pb_hooks
bun run dev      # App auf :3000
bun run test
```

## Deploy

App und PocketBase sind zwei getrennte Dienste in Dokploy und werden **unterschiedlich** ausgerollt.

| Dienst     | Bei Merge auf `main`                                            | Image                                               |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------- |
| App        | baut und deployt automatisch (`build-image.yml` → `deploy.yml`) | `ghcr.io/theaussie86/bruderschaft:sha-*`            |
| PocketBase | baut nur, **kein** Deploy (`build-pocketbase.yml`)              | `ghcr.io/theaussie86/bruderschaft-pocketbase:sha-*` |

**Wichtig:** Ändert ein PR etwas unter `pocketbase/` (Migrationen, Hooks), ist die neue App schon live, bevor PocketBase nachzieht. Bis dahin fehlen ihr z. B. neue oder umbenannte Felder. PocketBase deshalb direkt nach dem Merge von Hand ausrollen.

### PocketBase ausrollen

1. **Backup.** SSH-Tunnel öffnen und im Admin-UI unter Settings > Backups ein neues Backup anlegen:
   ```bash
   ssh -N -L 8091:127.0.0.1:8091 cwe-dokploy   # dann http://localhost:8091/_/
   ```
2. **Tag setzen.** In Dokploy, Projekt Bruderschaft, Compose-Anwendung `pocketbase`: in der Image-Zeile den `sha-*`-Tag des Merge-Commits eintragen (kurzer SHA, wie im Lauf "Build PocketBase" in GitHub Actions), speichern, **Deploy**.
3. **Prüfen.** In den Logs der Anwendung laufen neue Migrationen beim Start durch. Im Admin-UI kontrollieren, dass die Änderung angekommen ist.

**Rollback:** alten Tag eintragen **und** das Backup aus Schritt 1 im Admin-UI zurückspielen. Nur den Tag zurücksetzen reicht nicht, die Migration ist dann schon gelaufen.

Vorlage der Compose-Datei: [pocketbase/docker-compose.yml](pocketbase/docker-compose.yml). Hintergrund zu Backups und Updates: [docs/research/deployment-vps.md](docs/research/deployment-vps.md).
