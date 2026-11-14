import { Link, createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_app/profil')({ component: Profil })

function Profil() {
  return (
    <>
      <PageHeader title="Profil" />
      <Link
        to="/abmelden"
        className="border-line bg-anthracite text-bone inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold"
      >
        Abmelden
      </Link>
    </>
  )
}
