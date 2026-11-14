import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Ban, CalendarClock, ChevronLeft, ChevronRight, Copy, FileText, ImagePlus, MapPin, Pencil, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { Button, ClubImage, PageHeader, Pill, SectionTitle, notInDummy } from '../components/ui'
import { KIND_TONE, isPast } from '../components/termin'
import { dateLong, time } from '../lib/format'
import { actions, memberById, useApp } from '../mock/store'
import type { GalleryImage, Termin } from '../mock/data'

export const Route = createFileRoute('/_app/kalender/$terminId')({ component: TerminDetail })

function TerminDetail() {
  const { terminId } = Route.useParams()
  const state = useApp()
  const t = state.termine.find((x) => x.id === terminId)
  const isAdmin = state.role === 'admin'

  if (!t) {
    return (
      <>
        <PageHeader title="Termin" back="/kalender" />
        <div className="card p-8 text-center text-ash">Diesen Termin gibt es nicht (mehr).</div>
      </>
    )
  }

  const past = isPast(t)
  const hero = t.images?.[0]

  return (
    <>
      <PageHeader eyebrow={t.kind} title={t.title} back={past ? '/kalender?ansicht=vergangen' : '/kalender'} />

      {hero && (
        <div className="relative -mx-4 mb-5 aspect-[16/9] overflow-hidden sm:mx-0 sm:rounded-[20px]">
          <ClubImage src={hero.src} alt={t.title} className="size-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-iron via-transparent to-transparent" />
        </div>
      )}

      {t.cancelled && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rust/50 bg-rust/10 p-4">
          <Ban className="mt-0.5 size-5 shrink-0 text-rust-hi" />
          <div>
            <div className="font-semibold">Abgesagt</div>
            <div className="text-[15px] text-ash">Der Termin findet nicht statt. Er bleibt sichtbar, damit die Absage auch im Kalender-Abo ankommt.</div>
          </div>
        </div>
      )}

      <div className="card space-y-3.5 p-5">
        <div className="flex items-center gap-2">
          <Pill tone={KIND_TONE[t.kind]}>{t.kind}</Pill>
          {past && !t.cancelled && <Pill>vergangen</Pill>}
        </div>
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-brass" />
          <div className={t.cancelled ? 'line-through decoration-rust' : ''}>
            <div className="font-semibold">{dateLong(t.start)}</div>
            <div className="tnum text-[15px] text-ash">
              {t.allDay ? 'ganztägig' : `${time(t.start)} Uhr${t.end ? ` bis ${time(t.end)} Uhr` : ''}`}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-brass" />
          <div className="font-semibold">{t.place}</div>
        </div>
        {t.info && <p className="border-t border-line/60 pt-3.5 text-[16px] leading-relaxed text-bone/90">{t.info}</p>}
      </div>

      {t.kind === 'Veranstaltung' && !t.cancelled && <Gallery t={t} past={past} isAdmin={isAdmin} me={state.me} />}
      {t.kind === 'Sitzung' && <Protocol t={t} isAdmin={isAdmin} />}

      {isAdmin && (
        <>
          <SectionTitle>Admin</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button variant="secondary" onClick={() => notInDummy('Bearbeiten')}>
              <Pencil className="size-4" /> Bearbeiten
            </Button>
            <Button variant="secondary" onClick={() => notInDummy('Kopieren')}>
              <Copy className="size-4" /> Kopieren
            </Button>
            <Button
              variant={t.cancelled ? 'secondary' : 'danger'}
              className="col-span-2 sm:col-span-1"
              onClick={() => {
                actions.toggleCancel(t.id)
                actions.toast(t.cancelled ? 'Absage zurückgenommen' : 'Termin abgesagt')
              }}
            >
              {t.cancelled ? (
                <>
                  <RotateCcw className="size-4" /> Absage zurücknehmen
                </>
              ) : (
                <>
                  <Ban className="size-4" /> Absagen
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </>
  )
}

function Protocol({ t, isAdmin }: { t: Termin; isAdmin: boolean }) {
  return (
    <>
      <SectionTitle>Protokoll</SectionTitle>
      {t.protocol?.length ? (
        <ul className="card divide-y divide-line/60 overflow-hidden">
          {t.protocol.map((f) => (
            <li key={f.name}>
              <button
                onClick={() => actions.toast('Dummy-PDF: hier öffnet sich das Protokoll')}
                className="flex min-h-16 w-full items-center gap-3.5 px-4 text-left hover:bg-slate/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rust/15 text-rust-hi">
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="text-[13px] text-ash">PDF · {f.size}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card p-5 text-ash">{isPast(t) ? 'Noch kein Protokoll hochgeladen.' : 'Das Protokoll kommt nach der Sitzung.'}</div>
      )}
      {isAdmin && (
        <Button variant="quiet" full className="mt-3" onClick={() => notInDummy('Protokoll hochladen')}>
          <Upload className="size-4" /> Protokoll {t.protocol?.length ? 'ändern' : 'hochladen'}
        </Button>
      )}
    </>
  )
}

function Gallery({ t, past, isAdmin, me }: { t: Termin; past: boolean; isAdmin: boolean; me: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const images = t.images ?? []

  if (!past) {
    return (
      <>
        <SectionTitle>Bilder</SectionTitle>
        <div className="card p-5 text-[15px] text-ash">Nach der Veranstaltung könnt ihr hier Bilder hochladen. Dann landet sie im Archiv.</div>
      </>
    )
  }

  return (
    <>
      <SectionTitle aside={<span className="tnum text-[13px] text-ash">{images.length} Bilder</span>}>Bilder</SectionTitle>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) {
            actions.addImages(
              t.id,
              files.map((f) => URL.createObjectURL(f)),
            )
            actions.toast(`${files.length} ${files.length === 1 ? 'Bild' : 'Bilder'} hinzugefügt (nur lokal)`)
          }
          e.target.value = ''
        }}
      />
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        <button
          onClick={() => input.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-brass/50 text-[13px] font-semibold text-brass hover:bg-brass/5"
        >
          <ImagePlus className="size-6" />
          Hochladen
        </button>
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIndex(i)}
            className="animate-rise aspect-square overflow-hidden rounded-xl"
            style={{ animationDelay: `${i * 35}ms` }}
            aria-label={`Bild ${i + 1} im Vollbild`}
          >
            <ClubImage src={img.src} alt={`Bild ${i + 1}`} className="size-full transition-transform duration-500 hover:scale-105" />
          </button>
        ))}
      </div>
      {index !== null && images[index] && (
        <Lightbox
          images={images}
          index={index}
          setIndex={setIndex}
          canDelete={(img) => isAdmin || img.by === me}
          onDelete={(img) => {
            actions.removeImage(t.id, img.id)
            actions.toast('Bild gelöscht')
            setIndex(images.length <= 1 ? null : Math.max(0, Math.min(index, images.length - 2)))
          }}
        />
      )}
    </>
  )
}

function Lightbox({
  images,
  index,
  setIndex,
  canDelete,
  onDelete,
}: {
  images: Array<GalleryImage>
  index: number
  setIndex: (i: number | null) => void
  canDelete: (i: GalleryImage) => boolean
  onDelete: (i: GalleryImage) => void
}) {
  const img = images[index]
  const prev = useCallback(() => setIndex((index - 1 + images.length) % images.length), [index, images.length, setIndex])
  const next = useCallback(() => setIndex((index + 1) % images.length), [index, images.length, setIndex])
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [prev, next, setIndex])

  return (
    <div
      className="animate-fade fixed inset-0 z-[80] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Bild im Vollbild"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) {
          if (dx > 0) prev()
          else next()
        }
        touchX.current = null
      }}
    >
      <div className="pt-safe flex items-center justify-between px-2">
        <span className="tnum px-3 text-[15px] text-ash">
          {index + 1} / {images.length}
        </span>
        <button onClick={() => setIndex(null)} className="flex size-12 items-center justify-center text-bone" aria-label="Schließen">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <ClubImage key={img.id} src={img.src} alt={`Bild ${index + 1}`} fit="contain" className="animate-fade max-h-full max-w-full" />
        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-black/50 text-bone" aria-label="Vorheriges Bild">
              <ChevronLeft className="size-6" />
            </button>
            <button onClick={next} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-black/50 text-bone" aria-label="Nächstes Bild">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <div className="pb-safe flex items-center justify-between px-4 py-3">
        <span className="text-[14px] text-ash">von {memberById(img.by)?.name ?? 'Ehemaliges Mitglied'}</span>
        {canDelete(img) && (
          <button onClick={() => onDelete(img)} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-rust-hi hover:bg-rust/10">
            <Trash2 className="size-4" /> Löschen
          </button>
        )}
      </div>
    </div>
  )
}
