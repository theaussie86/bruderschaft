import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Bild } from '@/lib/bilder'
import type { Termin } from '@/lib/termine'
import { bildHochladen, bildLoeschen, bildPfad, ladeBilder } from '@/lib/bilder'
import { fehlertext } from '@/lib/geburtstag'
import { bilderErlaubt } from '@/lib/termine'

// Bilder einer Veranstaltung: Raster mit Upload vom Handy und Vollbild.
// Mitglieder löschen ihre eigenen Bilder, Admins jedes. Wer ein Bild
// hochgeladen hat, sehen nur Admins.
export function Bilder({
  termin,
  mitglied,
}: {
  termin: Termin
  mitglied: { id: string; admin: boolean }
}) {
  const [bilder, setBilder] = useState<Array<Bild> | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hochladen, setHochladen] = useState<{
    fertig: number
    gesamt: number
  } | null>(null)
  const [index, setIndex] = useState<number | null>(null)
  const eingabe = useRef<HTMLInputElement>(null)
  const erlaubt = bilderErlaubt(termin)

  const laden = useCallback(async () => {
    try {
      setBilder(await ladeBilder(termin.id))
    } catch (err) {
      setFehler(fehlertext(err, 'Die Bilder konnten nicht geladen werden.'))
    }
  }, [termin.id])

  useEffect(() => {
    void laden()
  }, [laden])

  async function dateienGewaehlt(dateien: Array<File>) {
    if (dateien.length === 0) return
    setFehler(null)
    let fehlgeschlagen = 0
    for (let i = 0; i < dateien.length; i++) {
      setHochladen({ fertig: i, gesamt: dateien.length })
      try {
        await bildHochladen(termin.id, mitglied.id, dateien[i])
      } catch {
        fehlgeschlagen++
      }
    }
    setHochladen(null)
    if (fehlgeschlagen > 0)
      setFehler(
        fehlgeschlagen === 1
          ? 'Ein Bild konnte nicht hochgeladen werden.'
          : `${fehlgeschlagen} Bilder konnten nicht hochgeladen werden.`,
      )
    await laden()
  }

  async function loeschen(bild: Bild) {
    setFehler(null)
    try {
      await bildLoeschen(bild.id)
      const rest = (bilder ?? []).filter((b) => b.id !== bild.id)
      setBilder(rest)
      setIndex((i) =>
        rest.length === 0 || i === null ? null : Math.min(i, rest.length - 1),
      )
    } catch (err) {
      setFehler(fehlertext(err, 'Das Bild konnte nicht gelöscht werden.'))
    }
  }

  const anzahl = bilder?.length ?? 0

  return (
    <section className="mt-8" aria-label="Bilder">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">Bilder</h2>
        {bilder !== null && anzahl > 0 && (
          <span className="tnum text-ash text-[13px]">
            {anzahl} {anzahl === 1 ? 'Bild' : 'Bilder'}
          </span>
        )}
      </div>

      {fehler && (
        <p role="alert" className="text-rust-hi mb-3 text-sm">
          {fehler}
        </p>
      )}

      {!erlaubt && anzahl === 0 ? (
        <div className="card text-ash p-5 text-[15px]">
          {termin.abgesagt
            ? 'Die Veranstaltung ist abgesagt, Bilder gibt es dazu nicht.'
            : 'Sobald die Veranstaltung begonnen hat, könnt ihr hier Bilder hochladen.'}
        </div>
      ) : bilder === null ? (
        !fehler && <p className="text-ash">Lädt …</p>
      ) : (
        <>
          <input
            ref={eingabe}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const dateien = Array.from(e.target.files ?? [])
              e.target.value = ''
              void dateienGewaehlt(dateien)
            }}
          />
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {erlaubt && (
              <button
                type="button"
                disabled={hochladen !== null}
                onClick={() => eingabe.current?.click()}
                className="border-brass/50 text-brass hover:bg-brass/5 flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-[13px] font-semibold disabled:opacity-60"
              >
                <ImagePlus className="size-6" />
                {hochladen
                  ? `${hochladen.fertig + 1} / ${hochladen.gesamt}`
                  : 'Hochladen'}
              </button>
            )}
            {bilder.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                className="bg-coal aspect-square overflow-hidden rounded-xl"
                aria-label={`Bild ${i + 1} im Vollbild`}
              >
                <img
                  src={bildPfad(b, '400x400')}
                  alt={`Bild ${i + 1}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {index !== null && bilder?.[index] && (
        <Vollbild
          bilder={bilder}
          index={index}
          setIndex={setIndex}
          zeigeName={mitglied.admin}
          darfLoeschen={(b) => mitglied.admin || b.mitglied === mitglied.id}
          onLoeschen={(b) => void loeschen(b)}
        />
      )}
    </section>
  )
}

function Vollbild({
  bilder,
  index,
  setIndex,
  zeigeName,
  darfLoeschen,
  onLoeschen,
}: {
  bilder: Array<Bild>
  index: number
  setIndex: (i: number | null) => void
  zeigeName: boolean
  darfLoeschen: (b: Bild) => boolean
  onLoeschen: (b: Bild) => void
}) {
  const bild = bilder[index]
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const zurueck = useCallback(
    () => setIndex((index - 1 + bilder.length) % bilder.length),
    [index, bilder.length, setIndex],
  )
  const weiter = useCallback(
    () => setIndex((index + 1) % bilder.length),
    [index, bilder.length, setIndex],
  )
  const wischX = useRef<number | null>(null)

  useEffect(() => {
    setLoeschenFragen(false)
  }, [index])

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null)
      if (e.key === 'ArrowLeft') zurueck()
      if (e.key === 'ArrowRight') weiter()
    }
    window.addEventListener('keydown', taste)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', taste)
      document.body.style.overflow = ''
    }
  }, [zurueck, weiter, setIndex])

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Bild im Vollbild"
      onTouchStart={(e) => (wischX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (wischX.current === null) return
        const dx = e.changedTouches[0].clientX - wischX.current
        if (Math.abs(dx) > 50) {
          if (dx > 0) zurueck()
          else weiter()
        }
        wischX.current = null
      }}
    >
      <div className="flex items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <span className="tnum text-ash px-3 text-[15px]">
          {index + 1} / {bilder.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex(null)}
          className="text-bone flex size-12 items-center justify-center"
          aria-label="Schließen"
        >
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <img
          key={bild.id}
          src={bildPfad(bild)}
          alt={`Bild ${index + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        {bilder.length > 1 && (
          <>
            <button
              type="button"
              onClick={zurueck}
              className="text-bone absolute left-2 flex size-12 items-center justify-center rounded-full bg-black/50"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={weiter}
              className="text-bone absolute right-2 flex size-12 items-center justify-center rounded-full bg-black/50"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="text-ash truncate text-[14px]">
          {zeigeName &&
            `von ${bild.expand?.mitglied?.name ?? 'Ehemaliges Mitglied'}`}
        </span>
        {darfLoeschen(bild) &&
          (loeschenFragen ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLoeschen(bild)}
                className="text-rust-hi hover:bg-rust/10 flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold"
              >
                <Trash2 className="size-4" /> Wirklich löschen
              </button>
              <button
                type="button"
                onClick={() => setLoeschenFragen(false)}
                className="text-ash hover:text-bone min-h-11 px-3 font-semibold"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLoeschenFragen(true)}
              className="text-rust-hi hover:bg-rust/10 flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold"
            >
              <Trash2 className="size-4" /> Löschen
            </button>
          ))}
      </div>
    </div>
  )
}
