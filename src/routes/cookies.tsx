import { Link, createFileRoute } from '@tanstack/react-router'

import { useHinweisBestaetigt, zuruecksetzen } from '@/components/CookieHinweis'
import { PublicPage } from '@/components/PublicPage'
import { SPEICHERUNGEN } from '@/lib/cookie-hinweis'

// Öffentlich wie Impressum und Datenschutz (Issue #42). Listet jede
// Speicherung im Browser, die Liste kommt aus lib/cookie-hinweis.
export const Route = createFileRoute('/cookies')({ component: Cookies })

function Cookies() {
  const bestaetigt = useHinweisBestaetigt()

  return (
    <PublicPage title="Cookies">
      <div className="card text-ash space-y-4 p-5 leading-relaxed">
        <p>
          Die App speichert nur, was technisch nötig ist. Dafür braucht es
          keine Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG). Es gibt kein Tracking,
          keine Analyse, keine Werbung und keine Inhalte von Drittanbietern.
          Schriften liegen auf unserem eigenen Server.
        </p>

        <section>
          <h2 className="text-bone mb-2 font-semibold">
            Was in deinem Browser gespeichert wird
          </h2>
          <ul className="space-y-3">
            {SPEICHERUNGEN.map((s) => (
              <li key={s.name} className="bg-coal rounded-xl p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <code className="text-bone font-semibold">{s.name}</code>
                  <span className="text-smoke">{s.art}</span>
                </div>
                <p className="mt-1">{s.zweck}</p>
                <p className="text-smoke mt-1">Dauer: {s.dauer}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-bone mb-1 font-semibold">Hinweis erneut zeigen</h2>
          <p className="text-sm">
            Setzt den Eintrag <code>cookie-hinweis</code> zurück. Der Hinweis
            erscheint dann wieder unten am Bildschirm.
          </p>
          <button
            type="button"
            onClick={zuruecksetzen}
            disabled={!bestaetigt}
            className="border-line text-bone hover:border-brass disabled:text-smoke mt-3 min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed"
          >
            {bestaetigt ? 'Hinweis zurücksetzen' : 'Hinweis wird angezeigt'}
          </button>
        </section>

        <p className="text-sm">
          Mehr zum Umgang mit deinen Daten steht in der{' '}
          <Link to="/datenschutz" className="text-bone underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </div>
    </PublicPage>
  )
}
