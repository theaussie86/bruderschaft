# TanStack Start mit PocketBase auf Bun, selbst gehostet

Die App läuft auf TanStack Start mit PocketBase als Backend (Auth, Datenbank, Dateien), Bun ist Runtime in Entwicklung und Betrieb. Betrieben wird beides auf einem eigenen VPS, E-Mails gehen über Resend. Für rund 20 Mitglieder reicht ein einzelnes PocketBase-Binary mit SQLite: keine laufenden Plattformkosten, Dateien und Login sind eingebaut, und der Betrieb passt in die vorhandene VPS-Infrastruktur, auf der PocketBase schon für andere Projekte läuft.

## Considered Options

- **Next.js mit Supabase**: das bisher übliche Muster. Verworfen, weil eine verwaltete Postgres-Plattform für eine kleine Vereins-App mehr Betrieb und Abhängigkeit bringt als nötig, und weil Supabase-Free-Projekte bei Inaktivität pausieren, was zu einer App passt, die zwischen den Bestellrunden wochenlang kaum genutzt wird.

## Consequences

- Kein Row Level Security in Postgres: Zugriffsschutz liegt in den API-Regeln der PocketBase-Collections und muss dort sorgfältig gepflegt werden.
- Einladungen gibt es in PocketBase nicht von Haus aus und müssen selbst gebaut werden.
- Backups des PocketBase-Datenverzeichnisses sind eigene Verantwortung.
