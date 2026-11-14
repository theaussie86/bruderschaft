import { createFileRoute } from '@tanstack/react-router'

import { PublicPage } from '@/components/PublicPage'

// Statisch (Spec #17). Name und Anschrift des Verantwortlichen trägt der Club
// vor dem Go-live ein, bis dahin stehen Platzhalter da.
export const Route = createFileRoute('/impressum')({ component: Impressum })

function Impressum() {
  return (
    <PublicPage title="Impressum">
      <div className="card text-ash space-y-4 p-5 leading-relaxed">
        <section>
          <h2 className="text-bone mb-1 font-semibold">Angaben nach § 5 DDG</h2>
          <p>
            [Name des Clubs]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
          </p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">Vertreten durch</h2>
          <p>[Name des Verantwortlichen]</p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">Kontakt</h2>
          <p>E-Mail: [Kontaktadresse]</p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">
            Verantwortlich für den Inhalt
          </h2>
          <p>[Name des Verantwortlichen], Anschrift wie oben.</p>
        </section>
      </div>
    </PublicPage>
  )
}
