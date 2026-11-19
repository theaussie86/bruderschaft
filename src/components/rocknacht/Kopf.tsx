import { Link } from '@tanstack/react-router'
import { ArrowRight, LogIn } from 'lucide-react'

// Kopfzeile der öffentlichen Startseite: Marke links, der Weg in die
// Mitglieder-App dezent rechts. Die Startseite gehört der Rocknacht, der
// Login ist eine eigene Seite.
export function Kopf({
  mitgliedAngemeldet,
  className = '',
}: {
  mitgliedAngemeldet: boolean
  className?: string
}) {
  return (
    <header
      className={`pt-safe mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 ${className}`}
    >
      <Link to="/" className="mt-4 inline-flex items-center gap-3">
        <img
          src="/club-assets/brand/logo-256.webp"
          alt=""
          className="size-10 shrink-0"
        />
        <span className="font-display text-lg font-extrabold uppercase">
          Hahna Brothers
        </span>
      </Link>
      <Link
        to={mitgliedAngemeldet ? '/kalender' : '/login'}
        className="text-ash hover:text-bone hover:border-line focus-visible:outline-brass mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {mitgliedAngemeldet ? (
          <>
            Zur App
            <ArrowRight className="size-4" strokeWidth={2} />
          </>
        ) : (
          <>
            <LogIn className="size-4" strokeWidth={2} />
            Mitglieder
          </>
        )}
      </Link>
    </header>
  )
}
