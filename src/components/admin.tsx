import { useApp } from '../mock/store'
import { PageHeader } from './ui'
import type { ReactNode } from 'react'

/** Verwaltungsseite mit Kopfzeile. Für Mitglieder ein Hinweis statt Inhalt. */
export function AdminPage({ title, children }: { title: string; children: ReactNode }) {
  const { role } = useApp()
  return (
    <>
      <PageHeader eyebrow="Verwaltung" title={title} back="/profil" />
      {role === 'admin' ? (
        children
      ) : (
        <div className="card p-8 text-center text-ash">Nur für Admins. Oben im Banner auf „Admin“ umschalten.</div>
      )}
    </>
  )
}

export function Teaser({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 rounded-xl border border-dashed border-line px-4 py-3 text-[14px] text-ash">{children}</p>
  )
}
