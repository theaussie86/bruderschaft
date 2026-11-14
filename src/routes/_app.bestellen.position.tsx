import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Check, ChevronRight, Minus, Plus } from 'lucide-react'
import { Button, ClubImage, PageHeader, Pill } from '../components/ui'
import { MotifTile } from '../components/order'
import { ARTICLES } from '../mock/data'
import { actions, articleById, currentRound, findOrder, memberById, motifById, unitPrice, useApp } from '../mock/store'
import { euro } from '../lib/format'
import type { Article, PositionPrint } from '../mock/data'

interface Search {
  fuer?: string
  position?: string
  artikel?: string
}

export const Route = createFileRoute('/_app/bestellen/position')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    fuer: typeof s.fuer === 'string' ? s.fuer : undefined,
    position: typeof s.position === 'string' ? s.position : undefined,
    artikel: typeof s.artikel === 'string' ? s.artikel : undefined,
  }),
  component: PositionPage,
})

function PositionPage() {
  const { fuer, position, artikel } = Route.useSearch()
  const state = useApp()
  const round = currentRound(state)
  const memberId = fuer ?? state.me
  const forOther = !!fuer && fuer !== state.me
  const article = artikel ? articleById(artikel) : undefined

  if (!round || round.status !== 'offen') {
    return (
      <>
        <PageHeader title="Position" back="/bestellen" />
        <div className="card p-8 text-center text-ash">Die Bestellrunde ist abgeschlossen. Positionen lassen sich nicht mehr ändern.</div>
      </>
    )
  }

  const eyebrow = forOther ? `Für ${memberById(memberId)?.name ?? 'Mitglied'} · ${round.name}` : round.name

  if (!article) {
    return (
      <>
        <PageHeader eyebrow={eyebrow} title="Artikel wählen" back={forOther ? `/bestellen/mitglied/${memberId}` : '/bestellen'} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ARTICLES.filter((a) => !a.hidden).map((a, i) => {
            const firstMotif = a.spots.find((s) => s.motifIds?.length)?.motifIds?.[0]
            const m = firstMotif ? motifById(firstMotif) : undefined
            return (
              <li key={a.id} className="animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  to="/bestellen/position"
                  search={{ fuer, artikel: a.id }}
                  className="card group block overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brass/40"
                >
                  <div className="relative aspect-square overflow-hidden">
                    {a.image ? (
                      <ClubImage src={a.image} alt={a.name} fallbackLabel={a.name} className="size-full transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <MotifTile image={m?.image} name={a.name} className="size-full p-3" />
                    )}
                    <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-anthracite to-transparent" />
                  </div>
                  <div className="px-3.5 pt-1 pb-3.5">
                    <div className="leading-tight font-semibold">{a.name}</div>
                    <div className="tnum mt-1 text-[15px] text-brass">ab {euro(a.price)}</div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  const existing = position ? findOrder(state, round.id, memberId)?.positions.find((p) => p.id === position) : undefined

  return (
    <Configurator
      key={`${article.id}-${position ?? 'neu'}`}
      article={article}
      eyebrow={eyebrow}
      roundId={round.id}
      memberId={memberId}
      fuer={fuer}
      existing={existing}
    />
  )
}

function Configurator({
  article,
  eyebrow,
  roundId,
  memberId,
  fuer,
  existing,
}: {
  article: Article
  eyebrow: string
  roundId: string
  memberId: string
  fuer?: string
  existing?: { id: string; sizeId: string; prints: Array<PositionPrint>; qty: number }
}) {
  const navigate = useNavigate()
  const [sizeId, setSizeId] = useState<string | undefined>(
    existing?.sizeId ?? (article.sizes.length === 1 ? article.sizes[0].id : undefined),
  )
  const [prints, setPrints] = useState<Record<string, PositionPrint>>(() => {
    const init: Record<string, PositionPrint> = {}
    for (const s of article.spots) {
      const ex = existing?.prints.find((p) => p.spotId === s.id)
      if (ex) init[s.id] = ex
      else if (s.required && s.kind === 'motiv' && s.motifIds?.length === 1) init[s.id] = { spotId: s.id, motifId: s.motifIds[0] }
    }
    return init
  })
  const [qty, setQty] = useState(existing?.qty ?? 1)

  const printList = Object.values(prints)
  const price = useMemo(() => unitPrice({ articleId: article.id, sizeId: sizeId ?? '', prints: printList }), [article.id, sizeId, printList])
  const missing = article.spots.filter((s) => {
    if (!s.required) return false
    const p = prints[s.id] as PositionPrint | undefined
    return s.kind === 'text' ? !p?.text?.trim() : !p?.motifId
  })
  const valid = !!sizeId && missing.length === 0
  const back = fuer ? `/bestellen/mitglied/${fuer}` : '/bestellen'

  const save = () => {
    if (!sizeId) return
    actions.savePosition(roundId, memberId, {
      id: existing?.id,
      articleId: article.id,
      sizeId,
      qty,
      prints: printList.filter((p) => p.motifId || p.text?.trim()),
    })
    actions.toast(existing ? 'Position geändert' : 'Position im Auftrag')
    if (fuer) navigate({ to: '/bestellen/mitglied/$memberId', params: { memberId: fuer } })
    else navigate({ to: '/bestellen' })
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={article.name} back={back} />
      {!existing && (
        <Link to="/bestellen/position" search={{ fuer }} className="-mt-3 mb-4 inline-flex min-h-10 items-center text-sm text-brass">
          Anderen Artikel wählen
        </Link>
      )}

      <div className="card mb-6 flex gap-4 overflow-hidden p-3">
        {article.image ? (
          <ClubImage src={article.image} alt={article.name} className="size-24 shrink-0 rounded-xl" />
        ) : (
          <MotifTile
            image={motifById(article.spots[0]?.motifIds?.[0] ?? '')?.image}
            name={article.name}
            className="size-24 shrink-0 rounded-xl p-2"
          />
        )}
        <div className="py-1">
          <div className="tnum font-display text-2xl font-extrabold">{euro(article.price)}</div>
          <div className="text-[13px] text-ash">inkl. Aufdruck</div>
          {article.description && <p className="mt-1.5 text-[14px] leading-snug text-bone/80">{article.description}</p>}
        </div>
      </div>

      {/* Größe */}
      <Step n={1} title="Größe">
        <div className="flex flex-wrap gap-2">
          {article.sizes.map((s) => {
            const on = sizeId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                aria-pressed={on}
                className={`min-h-12 min-w-14 rounded-xl border px-4 text-[15px] font-semibold transition-all ${
                  on ? 'border-brass bg-brass/15 text-bone shadow-[0_0_0_1px_var(--color-brass)]' : 'border-line bg-coal text-bone/85 hover:border-ash/50'
                }`}
              >
                {s.label}
                {s.surcharge > 0 && <span className="tnum ml-1.5 text-[12px] font-normal text-brass">+{euro(s.surcharge)}</span>}
              </button>
            )
          })}
        </div>
      </Step>

      {/* Druckstellen */}
      {article.spots.map((spot, i) => {
        const cur = prints[spot.id] as PositionPrint | undefined
        const set = (p: PositionPrint | undefined) =>
          setPrints((prev) => {
            const next = { ...prev }
            if (p) next[spot.id] = p
            else delete next[spot.id]
            return next
          })
        return (
          <Step
            key={spot.id}
            n={i + 2}
            title={`Druckstelle ${spot.name}`}
            aside={
              <span className="flex items-center gap-1.5">
                {spot.surcharge > 0 && <span className="tnum text-[12px] text-brass">+{euro(spot.surcharge)}</span>}
                <Pill tone={spot.required ? 'brass' : 'neutral'}>{spot.required ? 'Pflicht' : 'optional'}</Pill>
              </span>
            }
          >
            {spot.kind === 'text' ? (
              <input
                className="field"
                placeholder={spot.placeholder}
                maxLength={20}
                value={cur?.text ?? ''}
                onChange={(e) => set(e.target.value ? { spotId: spot.id, text: e.target.value } : undefined)}
              />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {!spot.required && (
                  <button
                    onClick={() => set(undefined)}
                    aria-pressed={!cur}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-[13px] font-semibold transition-all ${
                      !cur ? 'border-brass bg-brass/10 text-bone shadow-[0_0_0_1px_var(--color-brass)]' : 'border-line text-ash hover:border-ash/50'
                    }`}
                  >
                    leer lassen
                  </button>
                )}
                {spot.motifIds?.map((mid) => {
                  const m = motifById(mid)
                  if (!m) return null
                  const on = cur?.motifId === mid
                  return (
                    <button
                      key={mid}
                      onClick={() => set({ spotId: spot.id, motifId: mid })}
                      aria-pressed={on}
                      className={`relative overflow-hidden rounded-xl border text-left transition-all ${
                        on ? 'border-brass shadow-[0_0_0_2px_var(--color-brass)]' : 'border-line hover:border-ash/50'
                      }`}
                    >
                      <MotifTile image={m.image} name={m.name} className="aspect-square w-full p-1.5" />
                      <span className="block truncate bg-coal px-2 py-1.5 text-[12px] font-semibold">{m.name}</span>
                      {on && (
                        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brass text-coal">
                          <Check className="size-4" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </Step>
        )
      })}

      {/* Anzahl */}
      <Step n={article.spots.length + 2} title="Anzahl">
        <div className="inline-flex items-center rounded-2xl border border-line bg-coal">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex size-12 items-center justify-center text-bone disabled:text-smoke"
            aria-label="Weniger"
          >
            <Minus className="size-5" />
          </button>
          <span className="tnum w-10 text-center font-display text-2xl font-extrabold">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="flex size-12 items-center justify-center text-bone" aria-label="Mehr">
            <Plus className="size-5" />
          </button>
        </div>
      </Step>

      {/* Preisleiste */}
      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-8 border-t border-line/70 bg-iron/95 px-4 pt-3 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:rounded-t-2xl lg:border-x lg:px-5">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className="tnum text-sm text-ash">
            {qty} × {euro(price)}
          </span>
          <span className="tnum font-display text-3xl font-black">{euro(price * qty)}</span>
        </div>
        <Button full disabled={!valid} onClick={save}>
          {existing ? 'Änderung übernehmen' : 'In den Auftrag'}
          <ChevronRight className="size-5" />
        </Button>
        {!valid && (
          <p className="mt-2 text-center text-[13px] text-ash">
            Noch offen: {[!sizeId && 'Größe', ...missing.map((m) => `Druckstelle ${m.name}`)].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </>
  )
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center gap-3">
        <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-full border border-brass/50 font-display text-sm font-bold text-brass">
          {n}
        </span>
        <h2 className="flex-1 font-display text-xl font-bold uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
