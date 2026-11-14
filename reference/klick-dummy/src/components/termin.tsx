import { Link } from '@tanstack/react-router'
import { Ban, Cake, ChevronRight, FileText, Images, MapPin } from 'lucide-react'
import { parts, time } from '../lib/format'
import { HEUTE } from '../mock/data'
import { ClubImage, Pill } from './ui'
import type { Termin, TerminKind } from '../mock/data'

export const isPast = (t: Termin) => t.start.slice(0, 10) < HEUTE

export const KIND_TONE: Record<TerminKind, 'neutral' | 'brass' | 'rust'> = {
  Stammtisch: 'brass',
  Veranstaltung: 'rust',
}

export function TerminRow({ t, past }: { t: Termin; past?: boolean }) {
  const p = parts(t.start)
  const imgs = t.images ?? []
  return (
    <Link
      to="/kalender/$terminId"
      params={{ terminId: t.id }}
      className={`card group flex items-stretch gap-0 overflow-hidden transition-all hover:border-brass/30 ${t.cancelled ? 'opacity-70' : ''}`}
    >
      <div
        className={`flex w-[72px] shrink-0 flex-col items-center justify-center border-r border-line/60 py-3 ${
          t.kind === 'Veranstaltung' && !t.cancelled ? 'bg-[linear-gradient(180deg,rgb(184_55_31/.18),transparent)]' : 'bg-coal/40'
        }`}
      >
        <span className="text-[12px] font-semibold tracking-wider text-ash uppercase">{p.weekday}</span>
        <span className={`tnum font-display text-[2rem] leading-none font-black ${t.cancelled ? 'text-smoke line-through' : ''}`}>{p.day}</span>
        <span className="text-[12px] font-semibold tracking-wider text-brass uppercase">{p.month}</span>
      </div>
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {t.title !== t.kind && <Pill tone={KIND_TONE[t.kind]}>{t.kind}</Pill>}
          {t.cancelled && (
            <Pill tone="rust">
              <Ban className="size-3" /> abgesagt
            </Pill>
          )}
        </div>
        <div className={`text-[17px] leading-tight font-semibold ${t.cancelled ? 'text-ash line-through decoration-rust decoration-2' : ''}`}>{t.title}</div>
        <div className="mt-1 flex items-center gap-1.5 truncate text-[14px] text-ash">
          {!t.allDay && time(t.start) && <span className="tnum">{time(t.start)} Uhr ·</span>}
          {t.allDay && <span>ganztägig ·</span>}
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{t.place}</span>
        </div>
        {past && t.kind === 'Veranstaltung' && (
          <div className="mt-2.5 flex items-center gap-2">
            {imgs.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {imgs.slice(0, 4).map((i) => (
                    <ClubImage key={i.id} src={i.src} alt="" className="size-9 rounded-lg border-2 border-anthracite" />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-[13px] text-ash">
                  <Images className="size-3.5" /> {imgs.length} Bilder
                </span>
              </>
            ) : (
              <span className="text-[13px] text-smoke">Noch keine Bilder</span>
            )}
          </div>
        )}
        {past && t.kind === 'Stammtisch' && t.protocol && (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-brass">
            <FileText className="size-3.5" /> Protokoll · {t.protocol.length} {t.protocol.length === 1 ? 'Datei' : 'Dateien'}
          </div>
        )}
      </div>
      <div className="flex items-center pr-3 text-smoke">
        <ChevronRight className="size-5" />
      </div>
    </Link>
  )
}

export interface Birthday {
  memberId: string
  name: string
  /** ISO-Datum des Geburtstags im angezeigten Jahr */
  date: string
  /** Alter, das das Mitglied wird */
  age: number
}

/** Geburtstag als Ganztags-Eintrag: kein Termin, keine Detailseite. */
export function BirthdayRow({ b }: { b: Birthday }) {
  const p = parts(b.date)
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-2.5">
      <div className="flex w-[56px] shrink-0 items-baseline justify-center gap-1.5 text-ash">
        <span className="tnum font-display text-[1.4rem] leading-none font-extrabold">{p.day}</span>
        <span className="text-[12px] font-semibold tracking-wider uppercase">{p.month}</span>
      </div>
      <Cake className="size-4 shrink-0 text-brass" />
      <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">
        {b.name} wird {b.age}
      </div>
      <span className="text-[13px] text-smoke">ganztägig</span>
    </div>
  )
}
