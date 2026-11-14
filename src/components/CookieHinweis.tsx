import { Link } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/Button'
import {
  hinweisBestaetigen,
  hinweisBestaetigt,
  hinweisZuruecksetzen,
} from '@/lib/cookie-hinweis'

// Eigenes Event, damit Hinweis und Cookie-Seite im selben Tab voneinander
// erfahren. Das storage-Event deckt andere Tabs ab.
const GEAENDERT = 'cookie-hinweis-geaendert'

function abonnieren(melden: () => void) {
  window.addEventListener(GEAENDERT, melden)
  window.addEventListener('storage', melden)
  return () => {
    window.removeEventListener(GEAENDERT, melden)
    window.removeEventListener('storage', melden)
  }
}

export function useHinweisBestaetigt() {
  return useSyncExternalStore(
    abonnieren,
    () => hinweisBestaetigt(window.localStorage),
    // Beim Server-Rendern unbekannt: als bestätigt behandeln, damit der
    // Hinweis nicht im HTML steht und bei Wiederkehrern aufblitzt.
    () => true,
  )
}

export function bestaetigen() {
  hinweisBestaetigen(window.localStorage)
  window.dispatchEvent(new Event(GEAENDERT))
}

export function zuruecksetzen() {
  hinweisZuruecksetzen(window.localStorage)
  window.dispatchEvent(new Event(GEAENDERT))
}

export function CookieHinweis() {
  const bestaetigt = useHinweisBestaetigt()
  if (bestaetigt) return null

  return (
    <div
      role="region"
      aria-label="Hinweis zu Cookies"
      className="card animate-rise fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <h2 className="text-bone font-semibold">Nur das Nötigste</h2>
      <p className="text-ash mt-2 text-sm leading-relaxed">
        Die App speichert nur, was sie für die Anmeldung braucht. Kein
        Tracking, keine Analyse, nichts von Drittanbietern.{' '}
        <Link to="/cookies" className="text-bone underline">
          Mehr dazu
        </Link>
      </p>
      <Button full className="mt-4" onClick={bestaetigen}>
        Verstanden
      </Button>
    </div>
  )
}
