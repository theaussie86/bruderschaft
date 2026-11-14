import { Link, createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { PublicPage } from '@/components/PublicPage'
import { SPEICHERUNGEN } from '@/lib/cookie-hinweis'

// Statisch (Spec #17). Der Verantwortliche steht als Platzhalter da, bis der
// Club ihn vor dem Go-live einträgt.
export const Route = createFileRoute('/datenschutz')({ component: Datenschutz })

function Datenschutz() {
  return (
    <PublicPage title="Datenschutz">
      <div className="card text-ash space-y-4 p-5 leading-relaxed">
        <Abschnitt titel="Verantwortlicher">
          <p>
            [Name des Verantwortlichen], [Anschrift], E-Mail: [Kontaktadresse]
          </p>
        </Abschnitt>
        <Abschnitt titel="Wofür die App da ist">
          <p>
            Die App ist nur für Mitglieder des Clubs. Zugänge vergibt der Club,
            eine Registrierung gibt es nicht. Sie dient der gemeinsamen
            Bestellung von Clubkleidung, den Terminen des Clubs, Bildern von
            Veranstaltungen und den Protokollen der Stammtische.
          </p>
        </Abschnitt>
        <Abschnitt titel="Welche Daten gespeichert werden">
          <ul className="list-disc space-y-1 pl-5">
            <li>Name, E-Mail-Adresse und Geburtstag eines Mitglieds</li>
            <li>Aufträge in den Bestellrunden samt Anmerkungen</li>
            <li>hochgeladene Bilder und Protokolle</li>
          </ul>
          <p className="mt-2">
            Rechtsgrundlage ist die Mitgliedschaft im Club (Art. 6 Abs. 1 lit. b
            DSGVO). Andere Mitglieder sehen weder Mail-Adressen noch die
            Aufträge anderer. Bilder werden vor dem Hochladen verkleinert und
            verlieren dabei ihren Standort.
          </p>
        </Abschnitt>
        <Abschnitt titel="Wo die Daten liegen">
          <p>
            Die Daten liegen bei [Hoster und Standort des Servers], Dateien bei
            [Speicherdienst und Standort]. E-Mails wie Einladungen und das
            Zurücksetzen des Passworts verschickt ein Mail-Dienstleister in
            unserem Auftrag.
          </p>
        </Abschnitt>
        <Abschnitt titel="Cookies">
          <p>
            Die App speichert in deinem Browser nur, was technisch notwendig
            ist. Dafür braucht es keine Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG).
            Es gibt keine Analyse, kein Tracking und keine Inhalte von
            Drittanbietern, Schriften liegen auf unserem eigenen Server. Einen
            Service Worker oder Offline-Speicher nutzt die App nicht.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {SPEICHERUNGEN.map((s) => (
              <li key={s.name}>
                <code className="text-bone">{s.name}</code> ({s.art}): {s.zweck}{' '}
                {s.dauer}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Details und den Hinweis zum Zurücksetzen findest du auf der Seite{' '}
            <Link to="/cookies" className="text-bone underline">
              Cookies
            </Link>
            .
          </p>
        </Abschnitt>
        <Abschnitt titel="Deine Rechte">
          <p>
            Du kannst Auskunft über deine Daten, ihre Berichtigung oder Löschung
            verlangen. Nach einer Löschung bleiben deine Aufträge und Bilder
            ohne Namen als "Ehemaliges Mitglied" erhalten. Wende dich dazu an
            den Verantwortlichen. Außerdem kannst du dich bei einer
            Datenschutz-Aufsichtsbehörde beschweren.
          </p>
        </Abschnitt>
      </div>
    </PublicPage>
  )
}

function Abschnitt({
  titel,
  children,
}: {
  titel: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-bone mb-1 font-semibold">{titel}</h2>
      {children}
    </section>
  )
}
