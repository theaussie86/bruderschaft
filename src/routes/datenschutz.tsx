import { Link, createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { PublicPage } from '@/components/PublicPage'
import { SPEICHERUNGEN } from '@/lib/cookie-hinweis'

// Statisch (Spec #17). Muss zu dem passen, was die App wirklich speichert:
// ändert sich ein Datenfeld, ein Dienstleister oder ein Standort, hier nachziehen.
export const Route = createFileRoute('/datenschutz')({ component: Datenschutz })

function Datenschutz() {
  return (
    <PublicPage title="Datenschutz">
      <div className="card text-ash space-y-4 p-5 leading-relaxed">
        <Abschnitt titel="Verantwortlicher">
          <p>
            Hahna Brothers, vertreten durch Bernd Frieß, Stephansrieder Straße
            6, 87724 Ottobeuren, E-Mail:{' '}
            <a
              href="mailto:bernd@hahnabrothers.de"
              className="text-bone underline"
            >
              bernd@hahnabrothers.de
            </a>
          </p>
        </Abschnitt>
        <Abschnitt titel="Wofür die App da ist">
          <p>
            Die App ist nur für Mitglieder der Bruderschaft. Zugänge vergibt
            sie, eine Registrierung gibt es nicht. Sie dient der gemeinsamen
            Bestellung von Brotherhood-Kleidung, den Terminen der Bruderschaft,
            Bildern von Veranstaltungen und Urlauben und den Protokollen der
            Stammtische.
          </p>
        </Abschnitt>
        <Abschnitt titel="Welche Daten gespeichert werden">
          <ul className="list-disc space-y-1 pl-5">
            <li>Name, E-Mail-Adresse und Geburtstag eines Mitglieds</li>
            <li>Aufträge in den Bestellrunden samt Anmerkungen</li>
            <li>hochgeladene Bilder und Protokolle</li>
            <li>
              ein geheimer Schlüssel für dein Kalender-Abo, falls du es nutzt
            </li>
          </ul>
          <p className="mt-2">
            Rechtsgrundlage ist die Mitgliedschaft in der Bruderschaft (Art. 6
            Abs. 1 lit. b DSGVO). Andere Mitglieder sehen weder Mail-Adressen
            noch die Aufträge anderer. Bilder werden vor dem Hochladen
            verkleinert und verlieren dabei ihren Standort. Das Kalender-Abo
            enthält Termine sowie Name, Geburtstag und Alter der Mitglieder,
            aber keine Mail-Adressen.
          </p>
        </Abschnitt>
        <Abschnitt titel="Wo die Daten liegen">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Die App und ihre Datenbank samt Bildern laufen auf einem Server
              von Hostinger International Ltd. (Zypern) in einem Rechenzentrum
              in der EU.
            </li>
            <li>
              Tägliche Sicherungen liegen bei Cloudflare R2 (Cloudflare, Inc.,
              USA), gespeichert in der EU.
            </li>
            <li>
              E-Mails wie Einladungen und das Zurücksetzen des Passworts
              verschickt Resend (Resend, Inc., USA) über Server in der EU. Weil
              das Unternehmen in den USA sitzt, ist ein Zugriff von dort nicht
              ausgeschlossen. Grundlage dafür sind die
              EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
            </li>
          </ul>
          <p className="mt-2">
            Mit allen drei Dienstleistern besteht ein Vertrag zur
            Auftragsverarbeitung (Art. 28 DSGVO). Wir geben deine Daten an
            niemanden sonst weiter.
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
        <Abschnitt titel="Wie lange die Daten bleiben">
          <p>
            Deine Daten bleiben gespeichert, solange du Mitglied bist. Wirst du
            gelöscht, verschwinden Name, E-Mail-Adresse, Geburtstag und der
            Schlüssel für das Kalender-Abo sofort aus der App. In den
            Sicherungen stehen sie noch, bis die ältesten Sicherungen nach
            spätestens 30 Tagen überschrieben werden.
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
