import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useSyncExternalStore } from 'react'

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

// Solange der Hinweis steht, bekommt die Seite unten so viel zusätzlichen
// Platz, wie er hoch ist. Sonst liegt er über dem Ende der Seite, z. B. über
// "Abmelden" im Profil, und man kommt nicht darunter.
function usePlatzUnten(hinweis: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = hinweis.current
    if (!el) return
    const body = document.body
    const vorher = body.style.paddingBottom
    const beobachter = new ResizeObserver(() => {
      body.style.paddingBottom = `${el.offsetHeight + 12}px`
    })
    beobachter.observe(el)
    return () => {
      beobachter.disconnect()
      body.style.paddingBottom = vorher
    }
  })
}

export function CookieHinweis() {
  const bestaetigt = useHinweisBestaetigt()
  const ref = useRef<HTMLDivElement>(null)
  usePlatzUnten(ref)
  if (bestaetigt) return null

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Hinweis zu Cookies"
      // Mobil über der Tab-Leiste der App-Shell (_app.tsx), ab lg ist dort keine.
      className="nicht-drucken card animate-rise fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md p-5 shadow-lg lg:bottom-3"
    >
      <h2 className="text-bone font-semibold">Nur das Nötigste</h2>
      <p className="text-ash mt-2 text-sm leading-relaxed">
        Die App speichert nur, was sie für die Anmeldung braucht. Kein Tracking,
        keine Analyse, nichts von Drittanbietern.{' '}
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
