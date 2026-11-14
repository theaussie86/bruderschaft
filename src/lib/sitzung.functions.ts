import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

import { POCKETBASE_URL } from './pocketbase'
import { COOKIE_OPTIONEN, SITZUNGS_COOKIE, SITZUNG_SEKUNDEN } from './sitzung'
import { verlaengereSitzung } from './sitzung-verlaengern'

// Läuft in der Root-Route bei jedem Laden: verlängert die Sitzung um weitere
// 90 Tage und liefert das angemeldete Mitglied, sonst null.
export const ladeSitzung = createServerFn({ method: 'GET' }).handler(
  async () => {
    const token = getCookie(SITZUNGS_COOKIE)
    if (!token) return null

    const sitzung = await verlaengereSitzung(token, POCKETBASE_URL)
    if (!sitzung) {
      deleteCookie(SITZUNGS_COOKIE, COOKIE_OPTIONEN)
      return null
    }
    setCookie(SITZUNGS_COOKIE, sitzung.token, {
      ...COOKIE_OPTIONEN,
      maxAge: SITZUNG_SEKUNDEN,
    })
    return sitzung.mitglied
  },
)
