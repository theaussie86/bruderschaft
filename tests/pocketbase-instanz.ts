import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import PocketBase from 'pocketbase'

// Startet ein frisches PocketBase mit den Migrationen und Hooks aus dem Repo.
// Binary und Version kommen aus scripts/pb-install.sh, genau wie beim
// Dev-Skript. Die globale Testumgebung nutzt es, und Tests, die den ganzen
// Datenbestand betrachten (z. B. "letzter Admin"), starten ein eigenes.

const ROOT = path.resolve(import.meta.dirname, '..')
const BIN = path.join(ROOT, '.pocketbase', 'pocketbase')

// Nur für die Tests: Der Superuser legt Testdaten an. Die App selbst kennt
// keinen Superuser-Token (ADR 0002).
export const SUPERUSER = {
  email: 'superuser@test.invalid',
  password: 'superuser-test-passwort',
}

// Clubname und App-Adresse stehen in Produktion in den PocketBase-Einstellungen,
// nicht im Code. Die Tests setzen eigene Werte.
export const TEST_CLUB = 'Testclub'
export const TEST_APP_URL = 'http://app.test'

export function installierePocketBase() {
  execFileSync(path.join(ROOT, 'scripts', 'pb-install.sh'), {
    stdio: 'inherit',
  })
}

function freierPort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port)
        else reject(new Error('Kein freier Port gefunden'))
      })
    })
  })
}

async function warteAufHealth(url: string) {
  const ende = Date.now() + 30_000
  while (Date.now() < ende) {
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.ok) return
    } catch {
      // PocketBase startet noch
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`PocketBase unter ${url} antwortet nicht`)
}

export async function startePocketBase(smtpPort?: number) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'pb-test-'))
  const dirs = [
    `--dir=${dataDir}`,
    `--migrationsDir=${path.join(ROOT, 'pocketbase', 'pb_migrations')}`,
    `--hooksDir=${path.join(ROOT, 'pocketbase', 'pb_hooks')}`,
  ]
  execFileSync(
    BIN,
    ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...dirs],
    { stdio: 'ignore' },
  )

  const port = await freierPort()
  const url = `http://127.0.0.1:${port}`
  const pb = spawn(
    BIN,
    ['serve', `--http=127.0.0.1:${port}`, '--hooksWatch=false', ...dirs],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )

  async function stop() {
    if (pb.exitCode === null) {
      const beendet = new Promise((r) => pb.once('exit', r))
      pb.kill()
      await beendet
    }
    rmSync(dataDir, { recursive: true, force: true })
  }

  try {
    await warteAufHealth(url)
    await richteEinstellungenEin(url, smtpPort)
  } catch (error) {
    await stop()
    throw error
  }

  return { url, stop }
}

async function richteEinstellungenEin(url: string, smtpPort?: number) {
  const pb = new PocketBase(url)
  await pb
    .collection('_superusers')
    .authWithPassword(SUPERUSER.email, SUPERUSER.password)
  await pb.settings.update({
    meta: {
      appName: TEST_CLUB,
      appURL: TEST_APP_URL,
      senderName: TEST_CLUB,
      senderAddress: 'noreply@test.invalid',
    },
    ...(smtpPort
      ? {
          smtp: {
            enabled: true,
            host: '127.0.0.1',
            port: smtpPort,
            tls: false,
          },
        }
      : {}),
  })
}
