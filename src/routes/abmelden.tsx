import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { PublicPage } from '@/components/PublicPage'

export const Route = createFileRoute('/abmelden')({ component: Abmelden })

function Abmelden() {
  const router = useRouter()
  const [fertig, setFertig] = useState(false)

  useEffect(() => {
    // Nur der Proxy kann das httpOnly-Cookie löschen.
    fetch('/pb/abmelden', { method: 'POST' })
      .then(() => router.invalidate())
      .finally(() => setFertig(true))
  }, [router])

  return (
    <PublicPage title="Abmelden">
      <p className="text-ash mb-6">
        {fertig ? 'Du bist abgemeldet.' : 'Du wirst abgemeldet …'}
      </p>
      {fertig && (
        <Link to="/login" className="text-brass font-semibold">
          Wieder anmelden
        </Link>
      )}
    </PublicPage>
  )
}
