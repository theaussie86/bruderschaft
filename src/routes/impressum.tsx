import { createFileRoute } from '@tanstack/react-router'
import { PublicPage } from '../components/PublicPage'

export const Route = createFileRoute('/impressum')({ component: Impressum })

function Impressum() {
  return (
    <PublicPage title="Impressum">
      <div className="card space-y-3 p-5 text-ash">
        <p className="text-bone">Platzhalter.</p>
        <p>Hier stehen später Anbieter, vertretungsberechtigte Person, Anschrift und Kontakt nach § 5 DDG.</p>
        <p>Club e. V. · Musterstraße 1 · 00000 Musterstadt · info@example.org</p>
      </div>
    </PublicPage>
  )
}
