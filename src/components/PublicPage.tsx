import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

// Impressum, Datenschutz und Cookies: vor dem Login im Footer, danach im
// Profil (Issue #42).
export function RechtlicheLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Rechtliches"
      className={`text-smoke flex justify-center gap-6 text-sm ${className}`}
    >
      <Link to="/impressum" className="hover:text-bone">
        Impressum
      </Link>
      <Link to="/datenschutz" className="hover:text-bone">
        Datenschutz
      </Link>
      <Link to="/cookies" className="hover:text-bone">
        Cookies
      </Link>
    </nav>
  )
}

export function PublicFooter() {
  return (
    <footer className="mt-auto pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:pb-14">
      <RechtlicheLinks />
      <p className="text-smoke mt-4 text-center text-xs">
        Erstellt von{' '}
        <a
          href="https://weissteiner-automation.com"
          target="_blank"
          rel="noopener"
          className="hover:text-bone underline underline-offset-2"
        >
          Weissteiner Automation
        </a>
      </p>
    </footer>
  )
}

// Schlichte Seite ohne Tab-Leiste und ohne Sidebar, für die öffentlichen
// Seiten wie Login, Impressum und Datenschutz.
export function PublicPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5">
      <div className="mx-auto w-full max-w-md flex-1 pt-[calc(2rem+env(safe-area-inset-top))] lg:pt-14">
        <Link to="/" className="mb-10 inline-flex items-center gap-3">
          <img
            src="/club-assets/brand/logo-256.webp"
            alt=""
            className="size-12 shrink-0"
          />
          <span className="font-display text-xl font-extrabold uppercase">
            Hahna Brothers
          </span>
        </Link>
        <h1 className="font-display mb-6 text-4xl font-extrabold uppercase">
          {title}
        </h1>
        {children}
      </div>
      <PublicFooter />
    </div>
  )
}
