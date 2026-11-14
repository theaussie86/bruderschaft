import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function PublicFooter() {
  return (
    <footer className="pb-safe text-smoke mt-auto flex justify-center gap-6 py-6 text-sm">
      <Link to="/impressum" className="hover:text-bone">
        Impressum
      </Link>
      <Link to="/datenschutz" className="hover:text-bone">
        Datenschutz
      </Link>
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
      <div className="pt-safe mx-auto w-full max-w-md flex-1 pt-6">
        <Link to="/" className="mb-10 inline-flex items-center gap-3">
          <img
            src="/club-assets/brand/logo-icon.svg"
            alt=""
            className="size-12 shrink-0"
          />
          <span className="font-display text-xl font-extrabold uppercase">
            Club-App
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
