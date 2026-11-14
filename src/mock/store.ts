// Kleiner Store im Speicher. Kein Backend: ein Reload setzt alles zurück.
import { useSyncExternalStore } from 'react'
import {
  ARTICLES,
  CURRENT_MEMBER_ID,
  MEMBERS,
  MOTIFS,
  ORDERS,
  ROUNDS,
  SETTINGS,
  TERMINE,
} from './data'
import type { Article, Correction, Order, Position, Round, Settings, Termin } from './data'

export type Role = 'mitglied' | 'admin'

export interface Toast {
  id: number
  text: string
}

export interface AppState {
  role: Role
  me: string
  rounds: Array<Round>
  orders: Array<Order>
  termine: Array<Termin>
  settings: Settings
  toast: Toast | null
}

const initial = (): AppState => ({
  role: 'mitglied',
  me: CURRENT_MEMBER_ID,
  rounds: structuredClone(ROUNDS),
  orders: structuredClone(ORDERS),
  termine: structuredClone(TERMINE),
  settings: { ...SETTINGS },
  toast: null,
})

let state: AppState = initial()
const listeners = new Set<() => void>()
const serverSnapshot = initial()

function update(fn: (draft: AppState) => void) {
  const next = structuredClone(state)
  fn(next)
  state = next
  listeners.forEach((l) => l())
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
    () => serverSnapshot,
  )
}

let seq = 1000
const uid = (prefix: string) => `${prefix}${++seq}`

// ---------- Ableitungen ----------

export const articleById = (id: string): Article | undefined => ARTICLES.find((a) => a.id === id)
export const motifById = (id: string) => MOTIFS.find((m) => m.id === id)
export const memberById = (id: string) => MEMBERS.find((m) => m.id === id)

export function unitPrice(p: Pick<Position, 'articleId' | 'sizeId' | 'prints'>): number {
  const a = articleById(p.articleId)
  if (!a) return 0
  const size = a.sizes.find((s) => s.id === p.sizeId)
  let sum = a.price + (size?.surcharge ?? 0)
  for (const pr of p.prints) {
    const spot = a.spots.find((s) => s.id === pr.spotId)
    const filled = spot?.kind === 'text' ? !!pr.text?.trim() : !!pr.motifId
    if (spot && filled) sum += spot.surcharge
  }
  return sum
}

export const positionTotal = (p: Position) => unitPrice(p) * p.qty

export const orderSubtotal = (o: Order) => o.positions.reduce((t, p) => t + positionTotal(p), 0)

export const orderTotal = (o: Order) => (o.waived ? 0 : orderSubtotal(o) + (o.correction?.amount ?? 0))

export type OrderStand = 'leer' | 'in_arbeit' | 'fertig' | 'verzicht'

export function orderStand(o: Order | undefined): OrderStand {
  if (!o) return 'leer'
  if (o.waived) return 'verzicht'
  if (o.done) return 'fertig'
  if (o.positions.length > 0 || o.note.trim()) return 'in_arbeit'
  return 'leer'
}

export const STAND_LABEL: Record<OrderStand, string> = {
  leer: 'nichts eingetragen',
  in_arbeit: 'in Arbeit',
  fertig: 'fertig',
  verzicht: 'Verzicht',
}

export const isUnavailable = (p: Position) => {
  const a = articleById(p.articleId)
  return !a || !!a.hidden
}

export function printSummary(p: Position): string {
  const a = articleById(p.articleId)
  if (!a) return ''
  return p.prints
    .map((pr) => {
      const spot = a.spots.find((s) => s.id === pr.spotId)
      if (!spot) return null
      if (spot.kind === 'text') return pr.text?.trim() ? `${spot.name}: „${pr.text.trim()}“` : null
      const m = pr.motifId ? motifById(pr.motifId) : undefined
      return m ? `${spot.name}: ${m.name}` : null
    })
    .filter(Boolean)
    .join(' · ')
}

export const currentRound = (s: AppState) =>
  s.rounds.find((r) => r.status === 'offen') ?? s.rounds.find((r) => r.id === 'w2627')

export const findOrder = (s: AppState, roundId: string, memberId: string) =>
  s.orders.find((o) => o.roundId === roundId && o.memberId === memberId)

/** Mitglieder, die in einer Runde auftauchen: aktive und eingeladene, dazu Ausgetretene mit Auftrag. */
export function roundMembers(s: AppState, roundId: string) {
  return MEMBERS.filter((m) => m.status !== 'gesperrt' || !!findOrder(s, roundId, m.id))
}

// ---------- Aktionen ----------

function ensureOrder(d: AppState, roundId: string, memberId: string): Order {
  let o = findOrder(d, roundId, memberId)
  if (!o) {
    o = {
      id: `${roundId}-${memberId}`,
      roundId,
      memberId,
      positions: [],
      note: '',
      done: false,
      waived: false,
      paid: false,
    }
    d.orders.push(o)
  }
  return o
}

export const actions = {
  setRole(role: Role) {
    try {
      sessionStorage.setItem('dummy-rolle', role)
    } catch {
      // ohne sessionStorage bleibt die Rolle nur bis zum Reload
    }
    if (state.role === role) return
    update((d) => {
      d.role = role
    })
  },
  /** Nach der Hydration aufrufen: gewählte Ansicht über einen Reload retten. */
  restoreRole() {
    try {
      const r = sessionStorage.getItem('dummy-rolle')
      if ((r === 'admin' || r === 'mitglied') && r !== state.role) update((d) => void (d.role = r))
    } catch {
      // ignorieren
    }
  },
  toast(text: string) {
    update((d) => {
      d.toast = { id: Date.now(), text }
    })
  },
  clearToast(id: number) {
    if (state.toast?.id !== id) return
    update((d) => {
      d.toast = null
    })
  },
  savePosition(roundId: string, memberId: string, p: Omit<Position, 'id'> & { id?: string }) {
    update((d) => {
      const o = ensureOrder(d, roundId, memberId)
      o.waived = false
      if (p.id) {
        const i = o.positions.findIndex((x) => x.id === p.id)
        if (i >= 0) o.positions[i] = { ...p, id: p.id }
      } else {
        o.positions.push({ ...p, id: uid('p') })
      }
    })
  },
  removePosition(roundId: string, memberId: string, positionId: string) {
    update((d) => {
      const o = ensureOrder(d, roundId, memberId)
      o.positions = o.positions.filter((x) => x.id !== positionId)
    })
  },
  setNote(roundId: string, memberId: string, note: string) {
    update((d) => {
      ensureOrder(d, roundId, memberId).note = note
    })
  },
  setDone(roundId: string, memberId: string, done: boolean) {
    update((d) => {
      const o = ensureOrder(d, roundId, memberId)
      o.done = done
      if (done) o.waived = false
    })
  },
  setWaived(roundId: string, memberId: string, waived: boolean) {
    update((d) => {
      const o = ensureOrder(d, roundId, memberId)
      o.waived = waived
      if (waived) o.done = false
    })
  },
  setPaid(roundId: string, memberId: string, paid: boolean) {
    update((d) => {
      ensureOrder(d, roundId, memberId).paid = paid
    })
  },
  setCorrection(roundId: string, memberId: string, c: Correction | undefined) {
    update((d) => {
      ensureOrder(d, roundId, memberId).correction = c
    })
  },
  closeRound(roundId: string, includeUnfinished: boolean) {
    update((d) => {
      const r = d.rounds.find((x) => x.id === roundId)
      if (!r) return
      r.status = 'abgeschlossen'
      r.closedOn = '2026-11-14'
      for (const o of d.orders) {
        if (o.roundId !== roundId) continue
        o.excluded = !o.done && !o.waived && !includeUnfinished
      }
    })
  },
  reopenRound(roundId: string) {
    update((d) => {
      if (d.rounds.some((x) => x.status === 'offen' && x.id !== roundId)) return
      const r = d.rounds.find((x) => x.id === roundId)
      if (!r) return
      r.status = 'offen'
      r.closedOn = undefined
      for (const o of d.orders) if (o.roundId === roundId) o.excluded = false
    })
  },
  addTermin(t: Omit<Termin, 'id'>): string {
    const id = uid('t')
    update((d) => {
      d.termine.push({ ...t, id })
    })
    return id
  },
  toggleCancel(id: string) {
    update((d) => {
      const t = d.termine.find((x) => x.id === id)
      if (t) t.cancelled = !t.cancelled
    })
  },
  addImages(id: string, srcs: Array<string>) {
    update((d) => {
      const t = d.termine.find((x) => x.id === id)
      if (!t) return
      t.images = [...(t.images ?? []), ...srcs.map((src) => ({ id: uid('i'), src, by: d.me }))]
    })
  },
  removeImage(id: string, imageId: string) {
    update((d) => {
      const t = d.termine.find((x) => x.id === id)
      if (t?.images) t.images = t.images.filter((i) => i.id !== imageId)
    })
  },
  setPaymentHint(text: string) {
    update((d) => {
      d.settings.paymentHint = text
    })
  },
}
