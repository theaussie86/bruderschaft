import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  FileSpreadsheet,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  UserX,
} from 'lucide-react'
import { dateShort, dateWithDay, euro, signedEuro } from '../lib/format'
import {
  STAND_LABEL,
  actions,
  articleById,
  findOrder,
  isUnavailable,
  memberById,
  motifById,
  orderStand,
  orderSubtotal,
  orderTotal,
  positionTotal,
  printSummary,
  roundMembers,
  unitPrice,
  useApp,
} from '../mock/store'
import { MOTIFS } from '../mock/data'
import { Button, ClubImage, Pill, Sheet, Switch, notInDummy } from './ui'
import type { OrderStand } from '../mock/store'
import type { Order, Position, Round } from '../mock/data'

// ---------- Bausteine ----------

export function MotifTile({ image, name, className = '' }: { image?: string; name: string; className?: string }) {
  const dark = !!image && MOTIFS.some((m) => m.image === image && m.dark)
  return (
    <div className={`overflow-hidden ${dark ? 'bg-[#0b0b0b]' : 'bg-[#eee6d6]'} ${className}`}>
      <ClubImage src={image} alt={name} fallbackLabel={name} fit="contain" className={`size-full ${dark ? '' : 'mix-blend-multiply'}`} />
    </div>
  )
}

export function ArticleThumb({ articleId, motifId, className = '' }: { articleId: string; motifId?: string; className?: string }) {
  const a = articleById(articleId)
  if (a?.image) return <ClubImage src={a.image} alt={a.name} className={className} fallbackLabel={a.name} />
  const m = motifId ? motifById(motifId) : undefined
  if (m) return <MotifTile image={m.image} name={m.name} className={className} />
  return <ClubImage alt={a?.name ?? 'Artikel'} className={className} />
}

export function StandPill({ stand }: { stand: OrderStand }) {
  return <Pill tone={stand}>{STAND_LABEL[stand]}</Pill>
}

function PositionRow({
  p,
  editHref,
  onRemove,
}: {
  p: Position
  editHref?: { memberId?: string }
  onRemove?: () => void
}) {
  const a = articleById(p.articleId)
  const size = a?.sizes.find((s) => s.id === p.sizeId)
  const unavailable = isUnavailable(p)
  const firstMotif = p.prints.find((x) => x.motifId)?.motifId
  const body = (
    <>
      <ArticleThumb articleId={p.articleId} motifId={firstMotif} className="size-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">
            <span className="tnum text-brass">{p.qty}×</span> {a?.name ?? 'Unbekannter Artikel'}
          </span>
        </div>
        <div className="mt-0.5 text-[14px] text-ash">
          Größe {size?.label ?? '?'}
          {printSummary(p) && <> · {printSummary(p)}</>}
        </div>
        {unavailable && (
          <div className="mt-1.5">
            <Pill tone="rust">
              <Ban className="size-3" /> nicht mehr verfügbar
            </Pill>
          </div>
        )}
      </div>
      <div className="tnum shrink-0 text-right font-semibold">
        {euro(positionTotal(p))}
        {p.qty > 1 && <div className="text-[12px] font-normal text-smoke">je {euro(unitPrice(p))}</div>}
      </div>
    </>
  )
  return (
    <li className="flex items-center gap-2 border-b border-line/60 py-3 last:border-0">
      {editHref ? (
        <Link
          to="/bestellen/position"
          search={{ fuer: editHref.memberId, position: p.id, artikel: p.articleId }}
          className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-slate/60"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-smoke hover:bg-rust/10 hover:text-rust-hi"
          aria-label="Position entfernen"
        >
          <Trash2 className="size-[18px]" />
        </button>
      )}
    </li>
  )
}

function Totals({ o }: { o: Order }) {
  return (
    <div className="mt-2 space-y-1.5 border-t border-dashed border-line pt-3 text-[15px]">
      {o.correction && (
        <>
          <div className="flex items-baseline gap-2 text-ash">
            <span>Zwischensumme</span>
            <span className="leader" />
            <span className="tnum">{euro(orderSubtotal(o))}</span>
          </div>
          <div className="flex items-baseline gap-2 text-ash">
            <span className="truncate">Korrektur · {o.correction.reason}</span>
            <span className="leader" />
            <span className="tnum">{signedEuro(o.correction.amount)}</span>
          </div>
        </>
      )}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-bold uppercase">Summe</span>
        <span className="leader" />
        <span className="tnum font-display text-3xl font-extrabold">{euro(orderTotal(o))}</span>
      </div>
    </div>
  )
}

export function PaymentHint() {
  const { settings } = useApp()
  return (
    <div className="mt-4 rounded-2xl border border-brass/25 bg-brass/[0.06] p-4">
      <div className="eyebrow mb-1.5 flex items-center gap-2">
        <Coins className="size-4" /> Zahlungshinweis
      </div>
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-bone/90">{settings.paymentHint}</p>
    </div>
  )
}

const emptyOrder = (roundId: string, memberId: string): Order => ({
  id: `${roundId}-${memberId}`,
  roundId,
  memberId,
  positions: [],
  note: '',
  done: false,
  waived: false,
  paid: false,
})

// ---------- Auftrag (eigener oder durch Admin) ----------

export function OrderPanel({ round, memberId, mode }: { round: Round; memberId: string; mode: 'self' | 'admin' }) {
  const state = useApp()
  const o = findOrder(state, round.id, memberId) ?? emptyOrder(round.id, memberId)
  const stand = orderStand(o)
  const open = round.status === 'offen'
  const isAdminMode = mode === 'admin'
  const editable = open && stand !== 'verzicht' && (isAdminMode || stand !== 'fertig')
  const fuer = isAdminMode ? memberId : undefined
  const name = memberById(memberId)?.name ?? 'Ehemaliges Mitglied'

  return (
    <section className="card animate-rise overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
        <div>
          <div className="eyebrow">{isAdminMode ? `Auftrag von ${name}` : 'Dein Auftrag'}</div>
          <div className="mt-0.5 text-sm text-ash">
            {open ? `Bestelldatum ${dateWithDay(round.orderDate)}` : `abgeschlossen am ${dateShort(round.closedOn ?? round.orderDate)}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StandPill stand={stand} />
          {!open && stand !== 'verzicht' && <Pill tone={o.paid ? 'patina' : 'rust'}>{o.paid ? 'bezahlt' : 'noch nicht bezahlt'}</Pill>}
        </div>
      </div>

      <div className="px-5 pt-1 pb-5">
        {stand === 'verzicht' ? (
          <div className="py-8 text-center">
            <div className="font-display text-2xl font-bold uppercase">Diesmal nichts</div>
            <p className="mt-1 text-ash">
              {isAdminMode ? `${name} bestellt in dieser Runde nichts.` : 'Du bestellst in dieser Runde nichts. Das zählt als erledigt.'}
            </p>
            {open && (
              <Button variant="secondary" className="mt-5" onClick={() => actions.setWaived(round.id, memberId, false)}>
                <RotateCcw className="size-4" /> Doch bestellen
              </Button>
            )}
          </div>
        ) : (
          <>
            {o.positions.length === 0 ? (
              <div className="py-8 text-center text-ash">
                <div className="font-display text-xl font-bold text-bone uppercase">Noch nichts drin</div>
                <p className="mt-1 text-[15px]">{open ? 'Leg deine erste Position an.' : 'Keine Positionen.'}</p>
              </div>
            ) : (
              <ul>
                {o.positions.map((p) => (
                  <PositionRow
                    key={p.id}
                    p={p}
                    editHref={editable ? { memberId: fuer } : undefined}
                    onRemove={editable ? () => actions.removePosition(round.id, memberId, p.id) : undefined}
                  />
                ))}
              </ul>
            )}

            {editable && (
              <Link
                to="/bestellen/position"
                search={{ fuer }}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brass/40 text-[15px] font-semibold text-brass transition-colors hover:border-brass hover:bg-brass/5"
              >
                <Plus className="size-5" /> Position hinzufügen
              </Link>
            )}

            {o.positions.length > 0 && <Totals o={o} />}

            {/* Anmerkung */}
            {editable ? (
              <label className="mt-5 block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4 text-brass" /> Anmerkung
                </span>
                <textarea
                  className="field min-h-[84px] resize-y leading-snug"
                  placeholder="Alles, was die Auswahl nicht abdeckt, z. B. „Hoodie bitte eine Nummer größer“"
                  value={o.note}
                  onChange={(e) => actions.setNote(round.id, memberId, e.target.value)}
                />
                <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-brass/90">
                  <Printer className="size-3.5" /> Der Drucker sieht diesen Text.
                </span>
              </label>
            ) : (
              o.note && (
                <div className="mt-5 rounded-xl bg-coal/60 p-3.5 text-[15px]">
                  <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-ash">
                    <MessageSquare className="size-3.5" /> Anmerkung
                  </div>
                  {o.note}
                </div>
              )
            )}
          </>
        )}

        {/* Admin: Korrektur und bezahlt */}
        {isAdminMode && stand !== 'verzicht' && <AdminExtras round={round} o={o} />}

        {/* Abschicken / Verzicht */}
        {open && stand !== 'verzicht' && (
          <div className="mt-6">
            {stand === 'fertig' ? (
              <div className="rounded-2xl border border-patina/30 bg-patina/[0.07] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-patina/20 text-patina">
                    <Check className="size-5" strokeWidth={2.5} />
                  </span>
                  <div className="text-[15px]">
                    <div className="font-semibold">{isAdminMode ? 'Abgeschickt' : 'Abgeschickt, danke!'}</div>
                    <div className="text-ash">Wieder öffnen geht, solange die Runde offen ist.</div>
                  </div>
                </div>
                <Button variant="secondary" full className="mt-4" onClick={() => actions.setDone(round.id, memberId, false)}>
                  <RotateCcw className="size-4" /> Wieder öffnen
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button
                  full
                  disabled={o.positions.length === 0}
                  onClick={() => {
                    actions.setDone(round.id, memberId, true)
                    actions.toast(isAdminMode ? `Auftrag von ${name} ist fertig` : 'Auftrag abgeschickt')
                  }}
                >
                  <Check className="size-5" /> Bin fertig
                </Button>
                <Button variant="ghost" full onClick={() => actions.setWaived(round.id, memberId, true)}>
                  Diesmal nichts
                </Button>
              </div>
            )}
          </div>
        )}

        {!open && !isAdminMode && stand !== 'verzicht' && !o.paid && <PaymentHint />}
        {!open && o.excluded && (
          <p className="mt-4 flex items-center gap-2 text-sm text-ash">
            <Lock className="size-4" /> Beim Abschließen nicht fertig, daher nicht in der Sammelbestellung.
          </p>
        )}
      </div>
    </section>
  )
}

function AdminExtras({ round, o }: { round: Round; o: Order }) {
  const [amount, setAmount] = useState(o.correction ? String(o.correction.amount).replace('.', ',') : '')
  const [reason, setReason] = useState(o.correction?.reason ?? '')
  const open = round.status === 'offen'
  const parsed = Number(amount.replace(',', '.'))
  const valid = amount.trim() !== '' && !Number.isNaN(parsed) && parsed !== 0 && reason.trim() !== ''

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-line p-4">
      <div className="eyebrow">Nur für Admins</div>
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Bezahlt</div>
          <div className="text-[13px] text-ash">Summe ist auf dem Clubkonto eingegangen</div>
        </div>
        <Switch checked={o.paid} onChange={(v) => actions.setPaid(round.id, o.memberId, v)} label="Bezahlt" />
      </div>
      {open && (
        <div className="border-t border-line/60 pt-3">
          <div className="mb-2 font-semibold">Korrektur</div>
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <input className="field tnum" inputMode="decimal" placeholder="-5,00" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Betrag" />
            <input className="field" placeholder="Begründung, z. B. Porto" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Begründung" />
          </div>
          <p className="mt-1.5 text-[13px] text-ash">Plus schlägt auf, Minus zieht ab. Ändert die Summe, nicht die Preise.</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="quiet"
              disabled={!valid}
              onClick={() => {
                actions.setCorrection(round.id, o.memberId, { amount: parsed, reason: reason.trim() })
                actions.toast('Korrektur gespeichert')
              }}
            >
              Korrektur speichern
            </Button>
            {o.correction && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  actions.setCorrection(round.id, o.memberId, undefined)
                  setAmount('')
                  setReason('')
                }}
              >
                Entfernen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Admin-Übersicht der Runde ----------

const ORDER_OF_STAND: Array<OrderStand> = ['fertig', 'verzicht', 'in_arbeit', 'leer']
const BAR: Record<OrderStand, string> = {
  fertig: 'bg-patina',
  verzicht: 'bg-patina/45',
  in_arbeit: 'bg-brass',
  leer: 'bg-line',
}

export function AdminRoundCard({ round }: { round: Round }) {
  const state = useApp()
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  const members = roundMembers(state, round.id)
  const rows = members.map((m) => {
    const o = findOrder(state, round.id, m.id)
    return { m, o, stand: orderStand(o) }
  })
  const count = (s: OrderStand) => rows.filter((r) => r.stand === s).length
  const done = count('fertig') + count('verzicht')
  const paid = rows.filter((r) => r.o?.paid && r.stand === 'fertig').length
  const pending = rows.filter((r) => r.stand === 'leer' || r.stand === 'in_arbeit')
  const open = round.status === 'offen'

  return (
    <section className="animate-rise relative mb-6 overflow-hidden rounded-[20px] border border-brass/30 bg-[linear-gradient(160deg,rgb(200_157_92/.10),transparent_45%),var(--color-anthracite)]">
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Übersicht der Runde</span>
          <Pill tone="brass">Admin</Pill>
        </div>

        <div className="mt-3 flex items-end gap-5">
          <div>
            <div className="tnum font-display text-5xl leading-none font-black">
              {done}
              <span className="text-2xl text-smoke">/{rows.length}</span>
            </div>
            <div className="mt-1 text-sm text-ash">erledigt</div>
          </div>
          <div>
            <div className="tnum font-display text-3xl leading-none font-extrabold text-patina">{paid}</div>
            <div className="mt-1 text-sm text-ash">bezahlt</div>
          </div>
          <div className="ml-auto text-right text-sm text-ash">
            {open ? (
              <>
                Bestelldatum
                <br />
                <span className="font-semibold text-bone">{dateShort(round.orderDate)}</span>
              </>
            ) : (
              <Pill tone="neutral">
                <Lock className="size-3" /> abgeschlossen
              </Pill>
            )}
          </div>
        </div>

        <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
          {ORDER_OF_STAND.map((s) => (count(s) ? <span key={s} className={BAR[s]} style={{ flex: count(s) }} /> : null))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ash">
          {ORDER_OF_STAND.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${BAR[s]}`} />
              {count(s)} {STAND_LABEL[s]}
            </span>
          ))}
        </div>

        {open && pending.length > 0 && (
          <p className="mt-4 text-[15px]">
            <span className="text-ash">Noch ansprechen: </span>
            {pending.map((r) => r.m.name).join(', ')}
          </p>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between border-t border-line/70 px-5 text-[15px] font-semibold text-bone/90 hover:bg-slate/40"
        aria-expanded={expanded}
      >
        Alle Mitglieder ({rows.length})
        <ChevronDown className={`size-5 text-ash transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <ul className="animate-fade border-t border-line/70">
          {rows.map(({ m, o, stand }) => {
            const unavailable = o?.positions.some(isUnavailable)
            return (
              <li key={m.id} className="flex items-center border-b border-line/40 last:border-0">
                <Link
                  to="/bestellen/mitglied/$memberId"
                  params={{ memberId: m.id }}
                  className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-5 hover:bg-slate/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.name}</span>
                      {m.id === state.me && <span className="text-[12px] text-smoke">(du)</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StandPill stand={stand} />
                      {m.status === 'gesperrt' && (
                        <Pill tone="rust">
                          <UserX className="size-3" /> ausgetreten
                        </Pill>
                      )}
                      {unavailable && (
                        <Pill tone="rust">
                          <Ban className="size-3" /> nicht verfügbar
                        </Pill>
                      )}
                      {o?.note && (
                        <span className="flex items-center text-brass" title="Anmerkung">
                          <MessageSquare className="size-4" />
                        </span>
                      )}
                    </div>
                  </div>
                  {o && stand !== 'verzicht' && o.positions.length > 0 && (
                    <span className="tnum text-[15px] text-ash">{euro(orderTotal(o))}</span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-smoke" />
                </Link>
                <div className="flex w-16 shrink-0 justify-center pr-3">
                  {stand === 'fertig' ? (
                    <button
                      onClick={() => actions.setPaid(round.id, m.id, !o?.paid)}
                      aria-pressed={!!o?.paid}
                      aria-label={`${m.name} bezahlt`}
                      className={`flex size-11 items-center justify-center rounded-full border transition-colors ${
                        o?.paid ? 'border-patina/60 bg-patina/20 text-patina' : 'border-line text-smoke hover:border-ash'
                      }`}
                    >
                      {o?.paid ? <Check className="size-5" strokeWidth={2.5} /> : <span className="text-[13px] font-bold">€</span>}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-line/70 p-4">
        {open ? (
          <Button full variant="danger" onClick={() => setClosing(true)}>
            <Lock className="size-4" /> Runde abschließen
          </Button>
        ) : (
          <div>
            <div className="mb-2 text-sm text-ash">Sammelbestellung für den Drucker</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="quiet" onClick={() => notInDummy('PDF-Download')}>
                <FileText className="size-4" /> PDF
              </Button>
              <Button variant="quiet" onClick={() => notInDummy('Excel-Download')}>
                <FileSpreadsheet className="size-4" /> Excel
              </Button>
            </div>
            <Button
              full
              variant="ghost"
              className="mt-2"
              onClick={() => {
                actions.reopenRound(round.id)
                actions.toast('Runde wieder geöffnet')
              }}
            >
              <RotateCcw className="size-4" /> Wieder öffnen
            </Button>
          </div>
        )}
      </div>

      <CloseRoundSheet open={closing} onClose={() => setClosing(false)} round={round} />
    </section>
  )
}

function CloseRoundSheet({ open, onClose, round }: { open: boolean; onClose: () => void; round: Round }) {
  const state = useApp()
  const [include, setInclude] = useState<'mit' | 'ohne'>('ohne')
  const rows = roundMembers(state, round.id).map((m) => ({ m, o: findOrder(state, round.id, m.id) }))
  const unfinished = rows.filter(({ o }) => {
    const s = orderStand(o)
    return s === 'leer' || s === 'in_arbeit'
  })
  const unavailable = rows.flatMap(({ m, o }) =>
    (o?.positions ?? []).filter(isUnavailable).map((p) => `${m.name}: ${articleById(p.articleId)?.name ?? 'Artikel'}`),
  )

  return (
    <Sheet open={open} onClose={onClose} title="Runde abschließen?">
      <p className="mb-4 text-ash">
        {round.name}. Danach können Mitglieder nichts mehr ändern, und die Sammelbestellung steht zum Download bereit.
      </p>
      {unfinished.length > 0 && (
        <div className="mb-3 rounded-2xl border border-brass/40 bg-brass/10 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-brass" />
            <div>
              <div className="font-semibold">
                {unfinished.length} {unfinished.length === 1 ? 'Auftrag' : 'Aufträge'} noch nicht fertig
              </div>
              <div className="text-[15px] text-ash">{unfinished.map(({ m }) => m.name).join(', ')}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
            {(
              [
                ['mit', 'mitnehmen'],
                ['ohne', 'weglassen'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={include === id}
                onClick={() => setInclude(id)}
                className={`min-h-12 rounded-xl border text-[15px] font-semibold transition-colors ${
                  include === id ? 'border-brass bg-brass/20 text-bone' : 'border-line text-ash'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {unavailable.length > 0 && (
        <div className="mb-3 rounded-2xl border border-rust/40 bg-rust/10 p-4">
          <div className="flex items-start gap-2.5">
            <Ban className="mt-0.5 size-5 shrink-0 text-rust-hi" />
            <div>
              <div className="font-semibold">
                {unavailable.length} {unavailable.length === 1 ? 'Position' : 'Positionen'} nicht mehr verfügbar
              </div>
              <div className="text-[15px] text-ash">{unavailable.join(', ')}</div>
            </div>
          </div>
        </div>
      )}
      <p className="mb-5 flex items-center gap-2 text-sm text-ash">
        <Lock className="size-4" /> Preise werden beim Abschließen festgehalten.
      </p>
      <div className="grid gap-2">
        <Button
          full
          onClick={() => {
            actions.closeRound(round.id, include === 'mit')
            onClose()
            actions.toast('Runde abgeschlossen, Sammelbestellung bereit')
          }}
        >
          Abschließen
        </Button>
        <Button full variant="ghost" onClick={onClose}>
          Abbrechen
        </Button>
      </div>
    </Sheet>
  )
}
