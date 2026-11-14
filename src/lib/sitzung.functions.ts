import { createServerFn } from '@tanstack/react-start'
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server'

import { POCKETBASE_URL } from './pocketbase'
import { pruefeSitzung } from './sitzung-verlaengern'

// Läuft in der Root-Route bei jedem Laden: verlängert die Sitzung um weitere
// 90 Tage und liefert das angemeldete Mitglied, sonst null. Ohne Sitzung
// setzt die Antwort kein Cookie.
export const ladeSitzung = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { mitglied, setCookie } = await pruefeSitzung(
      getRequestHeader('cookie') ?? null,
      POCKETBASE_URL,
    )
    if (setCookie) setResponseHeader('set-cookie', setCookie)
    return mitglied
  },
)
