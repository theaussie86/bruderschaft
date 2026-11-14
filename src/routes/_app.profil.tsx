import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { VERWALTUNG_LINKS } from '@/components/verwaltung'

export const Route = createFileRoute('/_app/profil')({ component: Profil })

function Profil() {
  const { mitglied } = Route.useRouteContext()
  return (
    <>
      <PageHeader title="Profil" />
      {mitglied.admin && (
        <section className="mb-8" aria-label="Verwaltung">
          <div className="eyebrow mb-2">Verwaltung</div>
          <ul className="card divide-line/60 divide-y overflow-hidden">
            {VERWALTUNG_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="hover:bg-slate/40 flex min-h-14 items-center gap-3.5 px-5"
                >
                  <l.icon className="text-brass size-5" strokeWidth={1.8} />
                  <span className="flex-1 font-semibold">{l.label}</span>
                  <ChevronRight className="text-smoke size-5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link
        to="/abmelden"
        className="border-line bg-anthracite text-bone inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold"
      >
        Abmelden
      </Link>
    </>
  )
}
