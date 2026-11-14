import { createFileRoute, redirect } from '@tanstack/react-router'
import { EyeOff, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Sortierbar } from '@/lib/reihenfolge'
import type { Groesse, Motiv, SortimentArtikel } from '@/lib/sortiment'
import { Button } from '@/components/Button'
import { Markierung } from '@/components/Markierung'
import { PageHeader } from '@/components/PageHeader'
import { Pfeile } from '@/components/Pfeile'
import { Vorschau } from '@/components/Vorschau'
import { Aktionen } from '@/components/sortiment/Aktionen'
import { Druckstellen } from '@/components/sortiment/Druckstellen'
import { Motive } from '@/components/sortiment/Motive'
import { fehlertext } from '@/lib/geburtstag'
import { centAlsEingabe, centAus, euro } from '@/lib/geld'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'
import { naechsteSortierung, verschieben } from '@/lib/reihenfolge'
import { ladeMotive, ladeSortiment } from '@/lib/sortiment'

// Verwaltung > Sortiment: Artikel mit Größen und Druckstellen sowie die
// gemeinsame Motivliste anlegen, bearbeiten, Reihenfolge ändern, ausblenden,
// löschen (nur nie Bestelltes) und Artikel kopieren. Die Rechte und Regeln
// prüft PocketBase (ADR 0002).
export const Route = createFileRoute('/_app/verwaltung/sortiment')({
  beforeLoad: ({ context }) => {
    if (!context.mitglied.admin) throw redirect({ to: '/bestellen' })
  },
  component: Sortiment,
})

type Meldung = { text: string; fehler: boolean } | null

function Sortiment() {
  const [liste, setListe] = useState<Array<SortimentArtikel> | null>(null)
  const [motive, setMotive] = useState<Array<Motiv>>([])
  const [meldung, setMeldung] = useState<Meldung>(null)
  // 'neu' für das Anlegen, sonst die ID des Artikels in Bearbeitung.
  const [offen, setOffen] = useState<string | null>(null)

  const laden = useCallback(async () => {
    try {
      const [sortiment, motivliste] = await Promise.all([
        ladeSortiment(),
        ladeMotive(),
      ])
      setListe(sortiment)
      setMotive(motivliste)
    } catch (err) {
      setMeldung({
        text: fehlertext(err, 'Das Sortiment konnte nicht geladen werden.'),
        fehler: true,
      })
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  async function ausfuehren(aktion: () => Promise<unknown>, fehler: string) {
    setMeldung(null)
    try {
      await aktion()
    } catch (err) {
      setMeldung({ text: fehlertext(err, fehler), fehler: true })
    } finally {
      await laden()
    }
  }

  function neuOrdnen(
    collection: 'artikel' | 'groessen' | 'druckstellen' | 'motive',
    eintraege: Array<Sortierbar>,
    id: string,
    richtung: -1 | 1,
  ) {
    const pb = createBrowserPocketBase()
    return ausfuehren(
      () =>
        Promise.all(
          verschieben(eintraege, id, richtung).map((e) =>
            pb
              .collection(collection)
              .update(e.id, { sortierung: e.sortierung }),
          ),
        ),
      'Die Reihenfolge konnte nicht geändert werden.',
    )
  }

  return (
    <>
      <PageHeader title="Sortiment" />

      {offen === 'neu' ? (
        <div className="card mb-5 p-5">
          <ArtikelFormular
            sortierung={naechsteSortierung(liste ?? [])}
            onFertig={async (text) => {
              setOffen(null)
              if (text) setMeldung({ text, fehler: false })
              await laden()
            }}
          />
        </div>
      ) : (
        <Button full className="mb-5" onClick={() => setOffen('neu')}>
          <Plus className="size-4" /> Artikel anlegen
        </Button>
      )}

      {meldung && (
        <p
          role={meldung.fehler ? 'alert' : 'status'}
          className={`mb-5 text-sm ${meldung.fehler ? 'text-rust-hi' : 'text-patina'}`}
        >
          {meldung.text}
        </p>
      )}

      {liste === null ? (
        <p className="text-ash">Lädt …</p>
      ) : liste.length === 0 ? (
        <p className="text-ash">Noch keine Artikel angelegt.</p>
      ) : (
        <ul className="space-y-3">
          {liste.map((a, i) => (
            <li
              key={a.id}
              className={`card p-4 ${a.ausgeblendet ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-3">
                <Pfeile
                  name={a.name}
                  oben={i > 0}
                  unten={i < liste.length - 1}
                  onVerschieben={(r) => neuOrdnen('artikel', liste, a.id, r)}
                />
                <Vorschau eintrag={a} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.name}
                    {a.ausgeblendet && (
                      <Markierung ton="neutral">
                        <EyeOff className="size-3" /> ausgeblendet
                      </Markierung>
                    )}
                  </div>
                  <div className="text-ash text-[13px]">
                    {a.artikelnummer
                      ? `Artikelnummer ${a.artikelnummer}`
                      : 'Keine Artikelnummer'}
                  </div>
                  <button
                    type="button"
                    className="text-brass hover:text-bone mt-0.5 text-[13px] font-semibold"
                    aria-expanded={offen === a.id}
                    onClick={() => setOffen(offen === a.id ? null : a.id)}
                  >
                    {offen === a.id ? 'Schließen' : 'Bearbeiten'}
                  </button>
                </div>
                <div className="tnum shrink-0 font-semibold">
                  {euro(a.preis)}
                </div>
              </div>

              {offen === a.id && (
                <div className="border-line/60 mt-4 border-t pt-4">
                  <ArtikelFormular
                    artikel={a}
                    sortierung={a.sortierung}
                    onFertig={async (text) => {
                      setOffen(null)
                      if (text) setMeldung({ text, fehler: false })
                      await laden()
                    }}
                  />
                  <Aktionen
                    collection="artikel"
                    eintrag={a}
                    onGeaendert={async (text) => {
                      setOffen(null)
                      setMeldung(text ? { text, fehler: false } : null)
                      await laden()
                    }}
                    onFehler={(text) => setMeldung({ text, fehler: true })}
                  />
                </div>
              )}

              <Groessen
                artikel={a}
                onVerschieben={(id, r) =>
                  neuOrdnen('groessen', a.groessen, id, r)
                }
                onGeaendert={laden}
                onFehler={(text) => setMeldung({ text, fehler: true })}
              />

              <Druckstellen
                artikel={a}
                motive={motive}
                onVerschieben={(id, r) =>
                  neuOrdnen('druckstellen', a.druckstellen, id, r)
                }
                onGeaendert={laden}
                onFehler={(text) => setMeldung({ text, fehler: true })}
              />
            </li>
          ))}
        </ul>
      )}

      {liste !== null && (
        <Motive
          motive={motive}
          onVerschieben={(id, r) => neuOrdnen('motive', motive, id, r)}
          onGeaendert={laden}
          onFehler={(text) => setMeldung({ text, fehler: true })}
        />
      )}
    </>
  )
}

function ArtikelFormular({
  artikel,
  sortierung,
  onFertig,
}: {
  artikel?: SortimentArtikel
  sortierung: number
  onFertig: (meldung: string | null) => void | Promise<void>
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const preis = centAus(String(form.get('preis') ?? ''))
    if (preis === null) {
      setFehler('Bitte einen Preis wie 39,90 eingeben.')
      return
    }
    form.set('preis', String(preis))
    form.set('sortierung', String(sortierung))
    const bild = form.get('bild')
    if (!(bild instanceof File) || bild.size === 0) form.delete('bild')

    setFehler(null)
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      if (artikel) await pb.collection('artikel').update(artikel.id, form)
      else await pb.collection('artikel').create(form)
      await onFertig(
        artikel
          ? `${form.get('name')} gespeichert.`
          : `${form.get('name')} angelegt.`,
      )
    } catch (err) {
      setFehler(fehlertext(err, 'Der Artikel konnte nicht gespeichert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={speichern}>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Name</span>
        <input
          className="field"
          name="name"
          maxLength={100}
          required
          defaultValue={artikel?.name}
          placeholder="z. B. Hoodie schwarz"
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">
          Preis in Euro, inklusive Aufdruck
        </span>
        <input
          className="field"
          name="preis"
          inputMode="decimal"
          required
          defaultValue={artikel ? centAlsEingabe(artikel.preis) : ''}
          placeholder="39,90"
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">
          Beschreibung (optional)
        </span>
        <textarea
          className="field min-h-20"
          name="beschreibung"
          maxLength={2000}
          defaultValue={artikel?.beschreibung}
        />
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">
          Artikelnummer des Druckers (optional)
        </span>
        <input
          className="field"
          name="artikelnummer"
          maxLength={100}
          defaultValue={artikel?.artikelnummer}
        />
        <span className="text-smoke mt-1 block text-xs">
          Mitglieder sehen sie nicht, nur Admins und der Drucker.
        </span>
      </label>
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">
          {artikel?.bild ? 'Bild ersetzen (optional)' : 'Bild (optional)'}
        </span>
        <input
          className="field"
          name="bild"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      {fehler && (
        <p role="alert" className="text-rust-hi text-sm">
          {fehler}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={laeuft} className="flex-1">
          {artikel ? 'Speichern' : 'Anlegen'}
        </Button>
        <button
          type="button"
          className="text-ash hover:text-bone px-3 font-semibold"
          onClick={() => onFertig(null)}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

function Groessen({
  artikel,
  onVerschieben,
  onGeaendert,
  onFehler,
}: {
  artikel: SortimentArtikel
  onVerschieben: (id: string, richtung: -1 | 1) => void
  onGeaendert: () => Promise<void>
  onFehler: (text: string) => void
}) {
  // 'neu' für eine neue Größe, sonst die ID der Größe in Bearbeitung.
  const [offen, setOffen] = useState<string | null>(null)
  const { groessen } = artikel

  return (
    <section className="mt-4" aria-label={`Größen von ${artikel.name}`}>
      <div className="eyebrow mb-2">Größen</div>
      {groessen.length === 0 && (
        <p className="text-smoke mb-2 text-[13px]">Noch keine Größen.</p>
      )}
      <ul className="divide-line/60 divide-y">
        {groessen.map((g, i) => (
          <li key={g.id} className="py-1.5">
            <div className="flex items-center gap-2">
              <Pfeile
                name={g.name}
                oben={i > 0}
                unten={i < groessen.length - 1}
                onVerschieben={(r) => onVerschieben(g.id, r)}
              />
              <span className="flex-1 font-semibold">
                {g.name}
                {g.ausgeblendet && (
                  <span className="text-smoke ml-2 text-[13px] font-normal">
                    ausgeblendet
                  </span>
                )}
              </span>
              <span className="text-ash tnum text-[13px]">
                {g.aufpreis ? `+${euro(g.aufpreis)}` : 'kein Aufpreis'}
              </span>
              <button
                type="button"
                className="text-brass hover:text-bone text-[13px] font-semibold"
                aria-expanded={offen === g.id}
                onClick={() => setOffen(offen === g.id ? null : g.id)}
              >
                {offen === g.id ? 'Schließen' : 'Ändern'}
              </button>
            </div>
            {offen === g.id && (
              <>
                <GroesseFormular
                  artikelId={artikel.id}
                  groesse={g}
                  sortierung={g.sortierung}
                  onFertig={async () => {
                    setOffen(null)
                    await onGeaendert()
                  }}
                  onFehler={onFehler}
                />
                <Aktionen
                  collection="groessen"
                  eintrag={g}
                  onGeaendert={async () => {
                    setOffen(null)
                    await onGeaendert()
                  }}
                  onFehler={onFehler}
                />
              </>
            )}
          </li>
        ))}
      </ul>
      {offen === 'neu' ? (
        <GroesseFormular
          artikelId={artikel.id}
          sortierung={naechsteSortierung(groessen)}
          onFertig={async () => {
            setOffen(null)
            await onGeaendert()
          }}
          onFehler={onFehler}
        />
      ) : (
        <button
          type="button"
          className="text-ash hover:text-bone mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold"
          onClick={() => setOffen('neu')}
        >
          <Plus className="size-4" /> Größe hinzufügen
        </button>
      )}
    </section>
  )
}

function GroesseFormular({
  artikelId,
  groesse,
  sortierung,
  onFertig,
  onFehler,
}: {
  artikelId: string
  groesse?: Groesse
  sortierung: number
  onFertig: () => Promise<void>
  onFehler: (text: string) => void
}) {
  const [laeuft, setLaeuft] = useState(false)

  async function speichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const aufpreis = centAus(String(form.get('aufpreis') ?? ''))
    if (aufpreis === null) {
      onFehler('Bitte einen Aufpreis wie 3,00 eingeben oder leer lassen.')
      return
    }
    const daten = {
      artikel: artikelId,
      name: String(form.get('name') ?? ''),
      aufpreis,
      sortierung,
    }
    setLaeuft(true)
    try {
      const pb = createBrowserPocketBase()
      if (groesse) await pb.collection('groessen').update(groesse.id, daten)
      else await pb.collection('groessen').create(daten)
      await onFertig()
    } catch (err) {
      onFehler(fehlertext(err, 'Die Größe konnte nicht gespeichert werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={speichern}>
      <label className="min-w-24 flex-1">
        <span className="text-ash mb-1 block text-xs">Größe</span>
        <input
          className="field"
          name="name"
          maxLength={50}
          required
          defaultValue={groesse?.name}
          placeholder="z. B. XL"
        />
      </label>
      <label className="w-32">
        <span className="text-ash mb-1 block text-xs">Aufpreis in Euro</span>
        <input
          className="field"
          name="aufpreis"
          inputMode="decimal"
          defaultValue={
            groesse?.aufpreis ? centAlsEingabe(groesse.aufpreis) : ''
          }
          placeholder="0,00"
        />
      </label>
      <Button type="submit" disabled={laeuft}>
        {groesse ? 'Speichern' : 'Hinzufügen'}
      </Button>
    </form>
  )
}
