import { Cake } from 'lucide-react'

import type { Geburtstag } from '@/lib/termine'
import { tagTeile } from '@/lib/termine'

// Ein Geburtstag in der Kalenderliste: Kalenderblatt, Name und das Alter, das
// das Mitglied wird. Kein Termin, deshalb ohne Link.
export function GeburtstagZeile({
  geburtstag: g,
  beginn,
}: {
  geburtstag: Geburtstag
  beginn: string
}) {
  const tag = tagTeile(beginn)
  return (
    <div className="card flex items-stretch overflow-hidden">
      <div className="border-line/60 bg-coal/40 flex w-[72px] shrink-0 flex-col items-center justify-center border-r py-3">
        <span className="text-ash text-[12px] font-semibold tracking-wider uppercase">
          {tag.wochentag}
        </span>
        <span className="tnum font-display text-[2rem] leading-none font-black">
          {tag.tag}
        </span>
        <span className="text-brass text-[12px] font-semibold tracking-wider uppercase">
          {tag.monatKurz}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <Cake className="text-brass size-5 shrink-0" strokeWidth={1.8} />
        <div className="min-w-0">
          <div className="truncate text-[17px] leading-tight font-semibold">
            {g.name}
          </div>
          <div className="text-ash mt-1 text-[14px]">
            Geburtstag, wird {g.alter}
          </div>
        </div>
      </div>
    </div>
  )
}
