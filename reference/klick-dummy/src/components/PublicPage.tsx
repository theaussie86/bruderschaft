import { Link } from '@tanstack/react-router'
import { asset } from '../mock/data'
import { ClubImage } from './ui'
import type { ReactNode } from 'react'

export function PublicFooter() {
  return (
    <footer className="pb-safe mt-auto flex justify-center gap-6 py-6 text-sm text-smoke">
      <Link to="/impressum" className="hover:text-bone">
        Impressum
      </Link>
      <Link to="/datenschutz" className="hover:text-bone">
        Datenschutz
      </Link>
    </footer>
  )
}

/** Schlichte öffentliche Seite ohne Tab-Leiste und ohne Sidebar. */
export function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-2.5rem)] flex-col px-5">
      <div className="mx-auto w-full max-w-md flex-1 pt-6">
        <Link to="/" className="mb-10 inline-flex items-center gap-3">
          <span className="block size-12 shrink-0 overflow-hidden rounded-xl border border-rust/30 bg-black"><ClubImage src={asset('logo-dunkel.jpg')} alt="Club-Logo" className="size-full scale-[1.9]" /></span>
          <span className="font-display text-xl font-extrabold uppercase">Club-App</span>
        </Link>
        <h1 className="mb-6 font-display text-4xl font-extrabold uppercase">{title}</h1>
        {children}
      </div>
      <PublicFooter />
    </div>
  )
}
