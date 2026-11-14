import PocketBase from 'pocketbase'

// PocketBase ist nur im internen Netz erreichbar (ADR 0003). Lokal läuft es
// über `bun run dev:pb` auf Port 8090, in Produktion unter dem Netz-Alias des
// Compose-Dienstes.
export const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090'

// Pro Request eine eigene Instanz, nie eine geteilte: der authStore hängt am
// Mitglied, das den Request stellt (Research #2, Abschnitt 2).
export function createPocketBase() {
  const pb = new PocketBase(POCKETBASE_URL)
  pb.autoCancellation(false)
  return pb
}
