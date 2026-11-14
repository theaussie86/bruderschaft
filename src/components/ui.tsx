import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ImageOff, X } from 'lucide-react'
import { actions, useApp } from '../mock/store'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { OrderStand } from '../mock/store'

// ---------- Bild mit Fallback ----------

export function ClubImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  fit = 'cover',
}: {
  src?: string
  alt: string
  className?: string
  fallbackLabel?: string
  fit?: 'cover' | 'contain'
}) {
  const [failed, setFailed] = useState(!src)
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    // Fehler vor der Hydration lösen kein onError aus, daher nachprüfen.
    const el = ref.current
    if (el && el.complete && el.naturalWidth === 0) setFailed(true)
  }, [])
  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-slate text-smoke ${className}`}
        role="img"
        aria-label={alt}
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgb(255 255 255 / .025) 0 8px, transparent 8px 16px)',
        }}
      >
        <ImageOff className="size-5" strokeWidth={1.5} />
        {fallbackLabel && <span className="px-2 text-center text-[11px] leading-tight">{fallbackLabel}</span>}
      </div>
    )
  }
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`}
    />
  )
}

// ---------- Knöpfe ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-rust text-bone shadow-[0_1px_0_rgb(255_255_255/.15)_inset,0_8px_20px_-10px_rgb(184_55_31/.8)] hover:bg-rust-hi active:translate-y-px disabled:bg-slate disabled:text-smoke disabled:shadow-none',
  secondary: 'border border-line bg-anthracite text-bone hover:border-ash/50 active:translate-y-px disabled:text-smoke',
  ghost: 'text-brass hover:text-bone',
  danger: 'border border-rust/50 text-rust-hi hover:bg-rust/10',
  quiet: 'bg-slate text-bone hover:bg-line',
}

export function Button({
  variant = 'primary',
  full,
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; size?: 'md' | 'sm' }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed ${
        size === 'md' ? 'min-h-12 px-5 text-[15px]' : 'min-h-10 px-3.5 text-sm'
      } ${full ? 'w-full' : ''} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// ---------- Kopfzeile einer Seite ----------

export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: string
  eyebrow?: string
  back?: string
  action?: ReactNode
}) {
  const router = useRouter()
  return (
    <header className="mb-5 flex items-end gap-3 pt-5 lg:pt-10">
      {back && (
        <Link
          to={back}
          onClick={(e) => {
            if (window.history.length > 1) {
              e.preventDefault()
              router.history.back()
            }
          }}
          className="-ml-2 mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ash hover:bg-slate hover:text-bone"
          aria-label="Zurück"
        >
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className={`font-display leading-[0.95] font-extrabold uppercase [overflow-wrap:anywhere] hyphens-auto lg:text-5xl ${title.length > 16 ? 'text-[1.7rem]' : 'text-[2.15rem]'}`}>{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-3">
      <h2 className="eyebrow">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-brass/30 to-transparent" />
      {aside}
    </div>
  )
}

// ---------- Kennzeichen ----------

const STAND_STYLE: Record<OrderStand, string> = {
  leer: 'border-line text-ash',
  in_arbeit: 'border-brass/40 bg-brass/10 text-brass',
  fertig: 'border-patina/40 bg-patina/10 text-patina',
  verzicht: 'border-line bg-slate text-ash',
}

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: 'neutral' | 'rust' | 'brass' | 'patina' | OrderStand
  className?: string
}) {
  const map: Record<string, string> = {
    neutral: 'border-line text-ash',
    rust: 'border-rust/50 bg-rust/15 text-[#f08a6f]',
    brass: 'border-brass/40 bg-brass/10 text-brass',
    patina: 'border-patina/40 bg-patina/10 text-patina',
    ...STAND_STYLE,
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] leading-5 font-semibold whitespace-nowrap ${map[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

// ---------- Bottom-Sheet / Dialog ----------

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet sm:animate-pop relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border-t border-line bg-anthracite px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-[22px] sm:border sm:pt-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl leading-tight font-extrabold uppercase">{title}</h2>
          <button onClick={onClose} className="-mr-2 flex size-10 items-center justify-center rounded-full text-ash hover:bg-slate" aria-label="Schließen">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Schalter ----------

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-patina/60 bg-patina/30' : 'border-line bg-coal'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-[22px] rounded-full transition-transform ${checked ? 'translate-x-5 bg-patina' : 'bg-smoke'}`}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<[T, string]>
}) {
  return (
    <div className="flex rounded-2xl border border-line bg-coal p-1" role="tablist">
      {options.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`min-h-10 flex-1 rounded-xl text-[15px] font-semibold transition-all ${
            value === id ? 'bg-slate text-bone shadow-[0_1px_0_rgb(255_255_255/.06)_inset]' : 'text-ash hover:text-bone'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ---------- Toast ----------

export function ToastHost() {
  const { toast } = useApp()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => actions.clearToast(toast.id), 2600)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 lg:bottom-8">
      <div
        key={toast.id}
        role="status"
        className="animate-pop rounded-2xl border border-brass/30 bg-coal/95 px-4 py-3 text-[15px] font-medium text-bone shadow-[0_20px_40px_-10px_rgb(0_0_0/.8)] backdrop-blur"
      >
        {toast.text}
      </div>
    </div>
  )
}

export const notInDummy = (what: string) => actions.toast(`${what}: im Dummy nicht verfügbar`)
