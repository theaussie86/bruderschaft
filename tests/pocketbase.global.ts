import { starteTestSmtp } from './test-smtp'
import {
  SUPERUSER,
  installierePocketBase,
  startePocketBase,
} from './pocketbase-instanz'
import type { TestProject } from 'vitest/node'

// Startet pro Testlauf ein frisches PocketBase mit den Migrationen und Hooks
// aus dem Repo (tests/pocketbase-instanz.ts), dazu das Test-SMTP.
declare module 'vitest' {
  export interface ProvidedContext {
    pocketbaseUrl: string
    superuser: { email: string; password: string }
    postfachUrl: string
  }
}

export default async function setup(project: TestProject) {
  installierePocketBase()

  const smtp = await starteTestSmtp()
  let pb
  try {
    pb = await startePocketBase(smtp.smtpPort)
  } catch (error) {
    await smtp.stop()
    throw error
  }

  project.provide('pocketbaseUrl', pb.url)
  project.provide('superuser', SUPERUSER)
  project.provide('postfachUrl', smtp.postfachUrl)

  return async () => {
    await smtp.stop()
    await pb.stop()
  }
}
