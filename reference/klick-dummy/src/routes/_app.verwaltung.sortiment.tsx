import { createFileRoute } from '@tanstack/react-router'
import { EyeOff, GripVertical, Plus } from 'lucide-react'
import { AdminPage, Teaser } from '../components/admin'
import { Button, ClubImage, Pill, SectionTitle, notInDummy } from '../components/ui'
import { MotifTile } from '../components/order'
import { ARTICLES, MOTIFS } from '../mock/data'
import { euro } from '../lib/format'
import { actions, useApp } from '../mock/store'

export const Route = createFileRoute('/_app/verwaltung/sortiment')({ component: Sortiment })

function Sortiment() {
  const state = useApp()
  return (
    <AdminPage title="Sortiment">
      <Teaser>Angedeutet: Hier pflegt ein Admin Artikel, Größen, Druckstellen, Motive, Aufpreise und Reihenfolge. Im Dummy änderbar ist nur die Artikelnummer (Katalognummer des Druckers, Mitglieder sehen sie nicht).</Teaser>

      <SectionTitle aside={<Button size="sm" variant="ghost" onClick={() => notInDummy('Artikel anlegen')}><Plus className="size-4" /> Artikel</Button>}>
        Artikel
      </SectionTitle>
      <ul className="space-y-2.5">
        {ARTICLES.map((a) => (
          <li key={a.id} className={`card flex gap-3 p-3 ${a.hidden ? 'opacity-55' : ''}`}>
            <GripVertical className="mt-6 size-5 shrink-0 text-smoke" />
            {a.image ? (
              <ClubImage src={a.image} alt={a.name} className="size-16 shrink-0 rounded-lg" />
            ) : (
              <MotifTile image={MOTIFS.find((m) => m.id === a.spots[0]?.motifIds?.[0])?.image} name={a.name} className="size-16 shrink-0 rounded-lg p-1" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.name}</span>
                {a.hidden && (
                  <Pill>
                    <EyeOff className="size-3" /> ausgeblendet
                  </Pill>
                )}
              </div>
              <label className="mt-1 flex items-center gap-2 text-[13px] text-ash">
                Artikelnummer
                <input
                  className="field !min-h-8 !w-40 !px-2 !py-1 text-[13px]"
                  value={state.articleNumbers[a.id] ?? ''}
                  placeholder="optional"
                  onChange={(e) => actions.setArticleNumber(a.id, e.target.value)}
                />
              </label>
              <div className="mt-0.5 text-[13px] text-ash">
                Größen: {a.sizes.map((s) => (s.surcharge ? `${s.label} (+${euro(s.surcharge)})` : s.label)).join(', ')}
              </div>
              <div className="mt-0.5 text-[13px] text-ash">
                Druckstellen:{' '}
                {a.spots
                  .map((s) => `${s.name}${s.kind === 'text' ? ' (Text)' : ''}${s.required ? ' (Pflicht)' : ''}${s.surcharge ? ` +${euro(s.surcharge)}` : ''}`)
                  .join(', ')}
              </div>
            </div>
            <div className="tnum shrink-0 font-semibold">{euro(a.price)}</div>
          </li>
        ))}
      </ul>

      <SectionTitle aside={<Button size="sm" variant="ghost" onClick={() => notInDummy('Motiv anlegen')}><Plus className="size-4" /> Motiv</Button>}>
        Motive
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MOTIFS.map((m) => (
          <li key={m.id} className="card overflow-hidden">
            <MotifTile image={m.image} name={m.name} className="aspect-square p-2" />
            <div className="px-3 py-2 text-[14px] font-semibold">{m.name}</div>
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
