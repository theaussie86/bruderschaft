import { createFileRoute } from '@tanstack/react-router'
import { PublicPage } from '../components/PublicPage'

export const Route = createFileRoute('/datenschutz')({ component: Datenschutz })

function Datenschutz() {
  return (
    <PublicPage title="Datenschutz">
      <div className="card space-y-3 p-5 text-ash">
        <p className="text-bone">Platzhalter.</p>
        <p>
          Hier steht später, welche Daten die App speichert (Name, E-Mail, Aufträge, hochgeladene Bilder), wo sie liegen und wie
          Mitglieder Auskunft oder Löschung verlangen.
        </p>
        <p>Die App setzt nur ein technisch notwendiges Sitzungs-Cookie, keine Analyse und kein Tracking.</p>
      </div>
    </PublicPage>
  )
}
