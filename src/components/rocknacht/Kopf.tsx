import { Link } from '@tanstack/react-router'

// Kopfzeile der öffentlichen Startseite: nur die Marke. Der Weg in die
// Mitglieder-App steht dezent im Footer, Besucher sollen ihn nicht gleich
// sehen.
export function Kopf({ className = '' }: { className?: string }) {
  return (
    <header
      className={`pt-safe mx-auto flex w-full max-w-6xl items-center gap-4 px-5 ${className}`}
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
    </header>
  )
}
