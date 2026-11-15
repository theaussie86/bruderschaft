import { createFileRoute } from '@tanstack/react-router'

import { PublicPage } from '@/components/PublicPage'

// Statisch (Spec #17). Angaben nach § 5 DDG für den Betreiber der App.
export const Route = createFileRoute('/impressum')({ component: Impressum })

function Impressum() {
  return (
    <PublicPage title="Impressum">
      <div className="card text-ash space-y-4 p-5 leading-relaxed">
        <section>
          <h2 className="text-bone mb-1 font-semibold">Angaben nach § 5 DDG</h2>
          <p>
            Hahna Brothers
            <br />
            Stephansrieder Straße 6
            <br />
            87724 Ottobeuren
          </p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">Vertreten durch</h2>
          <p>Bernd Frieß</p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">Kontakt</h2>
          <p>
            E-Mail:{' '}
            <a
              href="mailto:bernd@hahnabrothers.de"
              className="text-bone underline"
            >
              bernd@hahnabrothers.de
            </a>
          </p>
        </section>
        <section>
          <h2 className="text-bone mb-1 font-semibold">
            Verantwortlich für den Inhalt
          </h2>
          <p>Bernd Frieß, Anschrift wie oben.</p>
        </section>
      </div>
    </PublicPage>
  )
}
