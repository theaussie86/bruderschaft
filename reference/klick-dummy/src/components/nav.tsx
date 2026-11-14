import { Layers, Settings2, Store, Users } from 'lucide-react'

export const ADMIN_LINKS = [
  { to: '/verwaltung/bestellrunden', label: 'Bestellrunden', icon: Layers },
  { to: '/verwaltung/sortiment', label: 'Sortiment', icon: Store },
  { to: '/verwaltung/mitglieder', label: 'Mitglieder', icon: Users },
  { to: '/verwaltung/einstellungen', label: 'Einstellungen', icon: Settings2 },
] as const

export function Monogram({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-brass/40 bg-gradient-to-br from-wood to-coal font-display font-extrabold text-brass uppercase ${
        size === 'lg' ? 'size-16 text-3xl' : 'size-10 text-lg'
      }`}
    >
      {name.slice(0, 1)}
    </span>
  )
}
