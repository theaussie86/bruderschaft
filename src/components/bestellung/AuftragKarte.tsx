import {
  Check,
  MessageSquare,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { Auftrag, Bestellrunde, Position } from '@/lib/bestellung'
import type { SortimentArtikel } from '@/lib/sortiment'
import { Button } from '@/components/Button'
import { Markierung } from '@/components/Markierung'
import { auftragsSumme, stueckpreis } from '@/lib/auftrag'
import { ladeAuftrag, tagAnzeigen } from '@/lib/bestellung'
import { fehlertext } from '@/lib/geburtstag'
import { euro } from '@/lib/geld'
import { createBrowserPocketBase } from '@/lib/pocketbase-browser'

const STATUS_TEXT = {
  in_arbeit: 'in Arbeit',
  fertig: 'fertig',
  verzicht: 'Verzicht',
} as const

// Der eigene Auftrag in der offenen Bestellrunde: Positionen, Summe live aus
// den aktuellen Preisen, Anmerkung, "Bin fertig" und "Diesmal nichts". Den
// Auftrag legt die Karte erst an, wenn das Mitglied etwas einträgt.
export function AuftragKarte({
  runde,
  mitglied,
  sortiment,
}: {
  runde: Bestellrunde
  mitglied: string
  sortiment: Array<SortimentArtikel>
}) {
  const [auftrag, setAuftrag] = useState<Auftrag | null>(null)
  const [positionen, setPositionen] = useState<Array<Position>>([])
  const [geladen, setGeladen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const laden = useCallback(async () => {
    const stand = await ladeAuftrag(runde.id, mitglied)
    setAuftrag(stand.auftrag)
    setPositionen(stand.positionen)
    setGeladen(true)
  }, [runde.id, mitglied])

  useEffect(() => {
    laden().catch((err: unknown) =>
      setFehler(fehlertext(err, 'Der Auftrag konnte nicht geladen werden.')),
    )
  }, [laden])

  async function ausfuehren(aktion: () => Promise<unknown>, standard: string) {
    setFehler(null)
    setLaeuft(true)
    try {
      await aktion()
    } catch (err) {
      setFehler(fehlertext(err, standard))
    } finally {
      try {
        await laden()
      } finally {
        setLaeuft(false)
      }
    }
  }

  // Liefert die ID des Auftrags und legt ihn beim ersten Eintrag an.
  async function auftragId(felder: Partial<Auftrag> = {}) {
    if (auftrag) return auftrag.id
    const pb = createBrowserPocketBase()
    const neu = await pb
      .collection('auftraege')
      .create<Auftrag>({ runde: runde.id, mitglied, ...felder })
    return neu.id
  }

  function statusSetzen(status: Auftrag['status']) {
    return ausfuehren(async () => {
      const pb = createBrowserPocketBase()
      if (auftrag)
        await pb.collection('auftraege').update(auftrag.id, { status })
      else await auftragId({ status })
    }, 'Der Auftrag konnte nicht geändert werden.')
  }

  if (!geladen)
    return fehler ? (
      <p role="alert" className="text-rust-hi text-sm">
        {fehler}
      </p>
    ) : (
      <p className="text-ash">Lädt …</p>
    )

  const status = auftrag?.status ?? null
  const bearbeitbar = status === null || status === 'in_arbeit'
  const zeilen = positionen.flatMap((p) => {
    const artikel = sortiment.find((a) => a.id === p.artikel)
    const groesse = artikel?.groessen.find((g) => g.id === p.groesse)
    return artikel && groesse ? [{ ...p, artikel, groesse }] : []
  })

  return (
    <section className="card overflow-hidden" aria-label="Dein Auftrag">
      <div className="border-line/60 flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <div className="eyebrow">Dein Auftrag</div>
          <div className="text-ash mt-0.5 text-sm">
            Bestelldatum {tagAnzeigen(runde.bestelldatum)}
          </div>
        </div>
        <Markierung ton={status === 'fertig' ? 'patina' : 'neutral'}>
          {status ? STATUS_TEXT[status] : 'nichts eingetragen'}
        </Markierung>
      </div>

      <div className="px-5 pt-1 pb-5">
        {status === 'verzicht' ? (
          <div className="py-8 text-center">
            <div className="font-display text-2xl font-bold uppercase">
              Diesmal nichts
            </div>
            <p className="text-ash mt-1">
              Du bestellst in dieser Runde nichts. Das zählt als erledigt.
            </p>
            <Button
              className="mt-5"
              disabled={laeuft}
              onClick={() => statusSetzen('in_arbeit')}
            >
              <RotateCcw className="size-4" /> Doch bestellen
            </Button>
          </div>
        ) : (
          <>
            {zeilen.length === 0 ? (
              <div className="text-ash py-8 text-center">
                <div className="font-display text-bone text-xl font-bold uppercase">
                  Noch nichts drin
                </div>
                <p className="mt-1 text-[15px]">Leg deine erste Position an.</p>
              </div>
            ) : (
              <ul className="divide-line/60 divide-y">
                {zeilen.map((z) => (
                  <li key={z.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{z.artikel.name}</div>
                      <div className="text-ash text-[13px]">
                        Größe {z.groesse.name} ·{' '}
                        {euro(stueckpreis(z.artikel, z.groesse))} pro Stück
                      </div>
                    </div>
                    {bearbeitbar ? (
                      <AnzahlFeld
                        position={z}
                        name={z.artikel.name}
                        disabled={laeuft}
                        onAendern={(anzahl) =>
                          ausfuehren(
                            () =>
                              createBrowserPocketBase()
                                .collection('positionen')
                                .update(z.id, { anzahl }),
                            'Die Anzahl konnte nicht geändert werden.',
                          )
                        }
                        onLoeschen={() =>
                          ausfuehren(
                            () =>
                              createBrowserPocketBase()
                                .collection('positionen')
                                .delete(z.id),
                            'Die Position konnte nicht gelöscht werden.',
                          )
                        }
                      />
                    ) : (
                      <span className="tnum text-ash">{z.anzahl}×</span>
                    )}
                    <span className="tnum w-20 text-right font-semibold">
                      {euro(z.anzahl * stueckpreis(z.artikel, z.groesse))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {bearbeitbar && (
              <PositionFormular
                sortiment={sortiment}
                disabled={laeuft}
                onAnlegen={(daten) =>
                  ausfuehren(async () => {
                    const id = await auftragId()
                    await createBrowserPocketBase()
                      .collection('positionen')
                      .create({ auftrag: id, ...daten })
                  }, 'Die Position konnte nicht angelegt werden.')
                }
              />
            )}

            {zeilen.length > 0 && (
              <div className="border-line/60 mt-4 flex items-baseline justify-between border-t pt-4">
                <span className="font-semibold">Summe</span>
                <span className="tnum text-xl font-bold">
                  {euro(auftragsSumme(zeilen))}
                </span>
              </div>
            )}

            <AnmerkungFeld
              key={auftrag?.anmerkung ?? ''}
              anmerkung={auftrag?.anmerkung ?? ''}
              bearbeitbar={bearbeitbar}
              disabled={laeuft}
              onSpeichern={(anmerkung) =>
                ausfuehren(async () => {
                  if (auftrag)
                    await createBrowserPocketBase()
                      .collection('auftraege')
                      .update(auftrag.id, { anmerkung })
                  else await auftragId({ anmerkung })
                }, 'Die Anmerkung konnte nicht gespeichert werden.')
              }
            />
          </>
        )}

        {fehler && (
          <p role="alert" className="text-rust-hi mt-4 text-sm">
            {fehler}
          </p>
        )}

        {status !== 'verzicht' && (
          <div className="mt-6">
            {status === 'fertig' ? (
              <div className="border-patina/30 bg-patina/[0.07] rounded-2xl border p-4">
                <div className="flex items-start gap-3">
                  <Check className="text-patina mt-0.5 size-5 shrink-0" />
                  <div className="text-[15px]">
                    <div className="font-semibold">Abgeschickt, danke!</div>
                    <div className="text-ash">
                      Wieder öffnen geht, solange die Runde offen ist.
                    </div>
                  </div>
                </div>
                <Button
                  full
                  className="mt-4"
                  disabled={laeuft}
                  onClick={() => statusSetzen('in_arbeit')}
                >
                  <RotateCcw className="size-4" /> Wieder öffnen
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button
                  full
                  disabled={laeuft || zeilen.length === 0}
                  onClick={() => statusSetzen('fertig')}
                >
                  <Check className="size-5" /> Bin fertig
                </Button>
                <button
                  type="button"
                  disabled={laeuft || zeilen.length > 0}
                  className="text-ash hover:text-bone disabled:text-smoke min-h-12 font-semibold disabled:cursor-not-allowed"
                  onClick={() => statusSetzen('verzicht')}
                >
                  Diesmal nichts
                </button>
                {zeilen.length > 0 && (
                  <p className="text-smoke text-center text-xs">
                    Für "Diesmal nichts" erst alle Positionen entfernen.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function AnzahlFeld({
  position,
  name,
  disabled,
  onAendern,
  onLoeschen,
}: {
  position: { anzahl: number }
  name: string
  disabled: boolean
  onAendern: (anzahl: number) => void
  onLoeschen: () => void
}) {
  const knopf =
    'text-ash hover:text-bone flex size-9 items-center justify-center rounded-lg disabled:opacity-40'
  return (
    <div className="flex items-center gap-1">
      {position.anzahl > 1 ? (
        <button
          type="button"
          className={knopf}
          disabled={disabled}
          aria-label={`${name}: eins weniger`}
          onClick={() => onAendern(position.anzahl - 1)}
        >
          <Minus className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          className={knopf}
          disabled={disabled}
          aria-label={`${name} entfernen`}
          onClick={onLoeschen}
        >
          <Trash2 className="size-4" />
        </button>
      )}
      <span className="tnum w-6 text-center font-semibold">
        {position.anzahl}
      </span>
      <button
        type="button"
        className={knopf}
        disabled={disabled}
        aria-label={`${name}: eins mehr`}
        onClick={() => onAendern(position.anzahl + 1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

// Neue Position: Artikel, dann Größe und Anzahl. Zur Wahl steht nur
// Eingeblendetes.
function PositionFormular({
  sortiment,
  disabled,
  onAnlegen,
}: {
  sortiment: Array<SortimentArtikel>
  disabled: boolean
  onAnlegen: (daten: {
    artikel: string
    groesse: string
    anzahl: number
  }) => Promise<void>
}) {
  const [offen, setOffen] = useState(false)
  const [artikelId, setArtikelId] = useState('')
  const [groesseId, setGroesseId] = useState('')
  const [anzahl, setAnzahl] = useState(1)

  const waehlbar = sortiment.filter(
    (a) => !a.ausgeblendet && a.groessen.some((g) => !g.ausgeblendet),
  )
  const artikel = waehlbar.find((a) => a.id === artikelId)
  const groessen = artikel?.groessen.filter((g) => !g.ausgeblendet) ?? []

  if (!offen)
    return (
      <button
        type="button"
        className="border-brass/40 text-brass hover:border-brass hover:bg-brass/5 mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-[15px] font-semibold transition-colors"
        onClick={() => setOffen(true)}
      >
        <Plus className="size-5" /> Position hinzufügen
      </button>
    )

  return (
    <form
      className="bg-coal/40 mt-2 space-y-3 rounded-xl p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!artikelId || !groesseId) return
        await onAnlegen({ artikel: artikelId, groesse: groesseId, anzahl })
        setOffen(false)
        setArtikelId('')
        setGroesseId('')
        setAnzahl(1)
      }}
    >
      <label className="block">
        <span className="text-ash mb-1.5 block text-sm">Artikel</span>
        <select
          className="field"
          required
          value={artikelId}
          onChange={(e) => {
            setArtikelId(e.target.value)
            setGroesseId('')
          }}
        >
          <option value="">Bitte wählen</option>
          {waehlbar.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({euro(a.preis)})
            </option>
          ))}
        </select>
      </label>
      {artikel && (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <label className="block">
            <span className="text-ash mb-1.5 block text-sm">Größe</span>
            <select
              className="field"
              required
              value={groesseId}
              onChange={(e) => setGroesseId(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {groessen.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.aufpreis ? `${g.name} (+${euro(g.aufpreis)})` : g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-ash mb-1.5 block text-sm">Anzahl</span>
            <input
              className="field tnum"
              type="number"
              min={1}
              max={99}
              required
              value={anzahl}
              onChange={(e) => setAnzahl(Math.max(1, Number(e.target.value)))}
            />
          </label>
        </div>
      )}
      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1"
          disabled={disabled || !artikelId || !groesseId}
        >
          Hinzufügen
        </Button>
        <button
          type="button"
          className="text-ash hover:text-bone px-3 font-semibold"
          onClick={() => setOffen(false)}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

function AnmerkungFeld({
  anmerkung,
  bearbeitbar,
  disabled,
  onSpeichern,
}: {
  anmerkung: string
  bearbeitbar: boolean
  disabled: boolean
  onSpeichern: (anmerkung: string) => Promise<void>
}) {
  const [text, setText] = useState(anmerkung)

  if (!bearbeitbar)
    return anmerkung ? (
      <div className="bg-coal/60 mt-5 rounded-xl p-3.5 text-[15px]">
        <div className="text-ash mb-1 flex items-center gap-1.5 text-[13px] font-semibold">
          <MessageSquare className="size-3.5" /> Anmerkung
        </div>
        {anmerkung}
      </div>
    ) : null

  return (
    <form
      className="mt-5"
      onSubmit={(e) => {
        e.preventDefault()
        void onSpeichern(text.trim())
      }}
    >
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="text-brass size-4" /> Anmerkung
        </span>
        <textarea
          className="field min-h-[84px] resize-y leading-snug"
          maxLength={2000}
          placeholder="Alles, was die Auswahl nicht abdeckt, z. B. „Hoodie bitte eine Nummer größer“"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <span className="text-brass/90 mt-1.5 flex items-center gap-1.5 text-[13px]">
          <Printer className="size-3.5" /> Der Drucker sieht diesen Text.
        </span>
      </label>
      {text.trim() !== anmerkung && (
        <Button type="submit" className="mt-2" disabled={disabled}>
          Anmerkung speichern
        </Button>
      )}
    </form>
  )
}
