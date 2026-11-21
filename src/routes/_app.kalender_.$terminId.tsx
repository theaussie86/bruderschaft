import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  Copy,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Termin } from '@/lib/termine'
import { Button } from '@/components/Button'
import { Markierung } from '@/components/Markierung'
import { PageHeader } from '@/components/PageHeader'
import { Bilder } from '@/components/termin/Bilder'
import { Protokoll } from '@/components/termin/Protokoll'
import { TerminFormular } from '@/components/termin/TerminFormular'
import { fehlertext } from '@/lib/geburtstag'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { ART_NAME, ladeTermin, tagTeile, zeitText } from '@/lib/termine'

// Ein Termin mit allen Angaben und den Bildern, bei Stammtischen zusätzlich mit
// dem Protokoll. Admins finden ganz oben die Knöpfe zum
// Verschieben, Bearbeiten, Kopieren, Absagen und Löschen; gelöscht werden nur falsch
// angelegte Termine.
export const Route = createFileRoute('/_app/kalender_/$terminId')({
  component: TerminSeite,
})

// PocketBase verweigert das Löschen, solange Bilder auf den Termin zeigen, und
// meldet das ohne Feldfehler.
const LOESCHEN_VERWEIGERT =
  'Zu diesem Termin gibt es Bilder, er lässt sich nicht löschen. Fällt er aus, sag ihn ab.'

const KNOPF =
  'border-line/70 text-bone hover:bg-slate/50 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60'

function TerminSeite() {
  const { terminId } = Route.useParams()
  const { mitglied } = Route.useRouteContext()
  const navigate = useNavigate()
  const [termin, setTermin] = useState<Termin | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [bearbeiten, setBearbeiten] = useState(false)
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  const laden = useCallback(async () => {
    try {
      setTermin(await ladeTermin(terminId))
    } catch (err) {
      setFehler(fehlertext(err, 'Diesen Termin gibt es nicht (mehr).'))
    }
  }, [terminId])

  useEffect(() => {
    void laden()
  }, [laden])

  async function absagen(abgesagt: boolean) {
    if (!termin) return
    setFehler(null)
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      setTermin(
        await pb.collection('termine').update<Termin>(termin.id, { abgesagt }),
      )
    } catch (err) {
      setFehler(fehlertext(err, 'Der Termin konnte nicht geändert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  async function loeschen() {
    if (!termin) return
    setLaeuft(true)
    try {
      await createBrowserPocketBase().collection('termine').delete(termin.id)
      await navigate({ to: '/kalender', replace: true })
    } catch (err) {
      const status = (err as { status?: number }).status
      const data = (err as { response?: { data?: object } }).response?.data
      setFehler(
        status === 400 && Object.keys(data ?? {}).length === 0
          ? LOESCHEN_VERWEIGERT
          : fehlertext(err, 'Der Termin konnte nicht gelöscht werden.'),
      )
      setLoeschenFragen(false)
      setLaeuft(false)
    }
  }

  return (
    <>
      <Link
        to="/kalender"
        className="text-ash hover:text-bone mt-5 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold lg:mt-10"
      >
        <ArrowLeft className="size-4" /> Kalender
      </Link>
      <PageHeader title={termin?.titel ?? 'Termin'} />

      {fehler && (
        <p role="alert" className="text-rust-hi mb-4 text-sm">
          {fehler}
        </p>
      )}

      {termin === null ? (
        !fehler && <p className="text-ash">Lädt …</p>
      ) : bearbeiten ? (
        <TerminFormular
          termin={termin}
          onGespeichert={(t) => {
            setTermin(t)
            setBearbeiten(false)
          }}
          onAbbrechen={() => setBearbeiten(false)}
        />
      ) : (
        <>
          {mitglied.admin && (
            <section className="mb-6" aria-label="Admin">
              <h2 className="eyebrow mb-3">Admin</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={KNOPF}
                  onClick={() => setBearbeiten(true)}
                >
                  <Pencil className="size-4" /> Verschieben / Bearbeiten
                </button>
                <Link
                  to="/kalender/neu"
                  search={{ kopie: termin.id }}
                  className={KNOPF}
                >
                  <Copy className="size-4" /> Kopieren
                </Link>
                <button
                  type="button"
                  className={KNOPF}
                  disabled={laeuft}
                  onClick={() => void absagen(!termin.abgesagt)}
                >
                  {termin.abgesagt ? (
                    <>
                      <RotateCcw className="size-4" /> Absage zurücknehmen
                    </>
                  ) : (
                    <>
                      <Ban className="size-4" /> Absagen
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className={`${KNOPF} text-rust-hi`}
                  disabled={laeuft || loeschenFragen}
                  onClick={() => setLoeschenFragen(true)}
                >
                  <Trash2 className="size-4" /> Löschen
                </button>
              </div>
              {loeschenFragen && (
                <div className="border-rust/40 mt-3 space-y-3 rounded-xl border p-4">
                  <p className="text-sm">
                    Termin endgültig löschen? Das ist nur für falsch angelegte
                    Termine gedacht. Fällt er aus, sag ihn stattdessen ab.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      disabled={laeuft}
                      onClick={() => void loeschen()}
                    >
                      Endgültig löschen
                    </Button>
                    <button
                      type="button"
                      className="text-ash hover:text-bone px-3 font-semibold"
                      onClick={() => setLoeschenFragen(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          {termin.abgesagt && (
            <div className="border-rust/50 bg-rust/10 mb-4 flex items-start gap-3 rounded-2xl border p-4">
              <Ban className="text-rust-hi mt-0.5 size-5 shrink-0" />
              <div>
                <div className="font-semibold">Abgesagt</div>
                <div className="text-ash text-[15px]">
                  Der Termin findet nicht statt. Er bleibt sichtbar, damit die
                  Absage auch im Kalender-Abo ankommt.
                </div>
              </div>
            </div>
          )}

          <div className="card space-y-3.5 p-5">
            <Markierung ton={termin.art === 'stammtisch' ? 'brass' : 'patina'}>
              {ART_NAME[termin.art]}
            </Markierung>
            <div className="flex items-start gap-3">
              <CalendarClock className="text-brass mt-0.5 size-5 shrink-0" />
              <div
                className={
                  termin.abgesagt ? 'decoration-rust line-through' : ''
                }
              >
                <div className="font-semibold">
                  {tagTeile(termin.beginn).lang}
                </div>
                <div className="tnum text-ash text-[15px]">
                  {zeitText(termin)}
                </div>
              </div>
            </div>
            {termin.ort && (
              <div className="flex items-start gap-3">
                <MapPin className="text-brass mt-0.5 size-5 shrink-0" />
                <div className="font-semibold">{termin.ort}</div>
              </div>
            )}
            {termin.infotext && (
              <p className="border-line/60 text-bone/90 border-t pt-3.5 text-[16px] leading-relaxed whitespace-pre-line">
                {termin.infotext}
              </p>
            )}
          </div>

          <Bilder termin={termin} mitglied={mitglied} />

          {termin.art === 'stammtisch' && (
            <Protokoll
              termin={termin}
              admin={mitglied.admin}
              onGeaendert={setTermin}
            />
          )}
        </>
      )}
    </>
  )
}
