import { Link } from '@tanstack/react-router'
import { Ban, ChevronRight, FileText, Images, MapPin } from 'lucide-react'

import type { Termin, TerminArt } from '@/lib/termine'
import { Markierung } from '@/components/Markierung'
import { ART_NAME, FARBWERT, tagTeile, zeitText } from '@/lib/termine'

const TON = {
  stammtisch: 'brass',
  veranstaltung: 'patina',
  urlaub: 'copper',
} as const satisfies Record<TerminArt, string>

// Ein Termin in der Liste: Kalenderblatt, Art, Titel, Zeit und Ort. Abgesagte
// bleiben sichtbar, durchgestrichen und markiert. Im Archiv steht bei
// Veranstaltungen und Urlauben die Zahl der Bilder dabei, bei Stammtischen das Protokoll.
export function TerminZeile({
  termin: t,
  bilder,
}: {
  termin: Termin
  bilder?: number
}) {
  const tag = tagTeile(t.beginn)
  return (
    <Link
      to="/kalender/$terminId"
      params={{ terminId: t.id }}
      className={`card group hover:border-brass/30 flex items-stretch overflow-hidden transition-all ${t.abgesagt ? 'opacity-70' : ''}`}
    >
      <div
        className="border-line/60 bg-coal/40 flex w-[72px] shrink-0 flex-col items-center justify-center border-r py-3"
        // Eine hinterlegte Farbe zeigt sich als Streifen am Kalenderblatt.
        style={
          t.farbe
            ? { boxShadow: `inset 4px 0 0 ${FARBWERT[t.farbe]}` }
            : undefined
        }
      >
        <span className="text-ash text-[12px] font-semibold tracking-wider uppercase">
          {tag.wochentag}
        </span>
        <span
          className={`tnum font-display text-[2rem] leading-none font-black ${t.abgesagt ? 'text-smoke line-through' : ''}`}
        >
          {tag.tag}
        </span>
        <span className="text-brass text-[12px] font-semibold tracking-wider uppercase">
          {tag.monatKurz}
        </span>
      </div>
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {t.titel !== ART_NAME[t.art] && (
            <Markierung ton={TON[t.art]}>{ART_NAME[t.art]}</Markierung>
          )}
          {t.abgesagt && (
            <Markierung ton="neutral">
              <Ban className="size-3" /> abgesagt
            </Markierung>
          )}
        </div>
        <div
          className={`text-[17px] leading-tight font-semibold ${t.abgesagt ? 'text-ash decoration-rust line-through decoration-2' : ''}`}
        >
          {t.titel}
        </div>
        <div className="text-ash mt-1 flex items-center gap-1.5 truncate text-[14px]">
          <span className="tnum">{zeitText(t)}</span>
          {t.ort && (
            <>
              <span>·</span>
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{t.ort}</span>
            </>
          )}
        </div>
        {bilder !== undefined && t.art === 'stammtisch' ? (
          <div className="text-ash mt-1.5 flex items-center gap-1.5 text-[13px]">
            <FileText className="size-3.5" /> Protokoll
          </div>
        ) : (
          bilder !== undefined && (
            <div className="text-ash mt-1.5 flex items-center gap-1.5 text-[13px]">
              <Images className="size-3.5" />
              {bilder === 0
                ? 'Noch keine Bilder'
                : `${bilder} ${bilder === 1 ? 'Bild' : 'Bilder'}`}
            </div>
          )
        )}
      </div>
      <div className="text-smoke flex items-center pr-3">
        <ChevronRight className="size-5" />
      </div>
    </Link>
  )
}
