import { ClipboardList, Settings, Shirt, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Bereiche der Verwaltung, nur für Admins. Sidebar und Profil zeigen dieselbe
// Liste.
export const VERWALTUNG_LINKS: Array<{
  to:
    | '/verwaltung/bestellrunden'
    | '/verwaltung/sortiment'
    | '/verwaltung/mitglieder'
    | '/verwaltung/einstellungen'
  label: string
  icon: LucideIcon
}> = [
  {
    to: '/verwaltung/bestellrunden',
    label: 'Bestellrunden',
    icon: ClipboardList,
  },
  { to: '/verwaltung/sortiment', label: 'Sortiment', icon: Shirt },
  { to: '/verwaltung/mitglieder', label: 'Mitglieder', icon: Users },
  { to: '/verwaltung/einstellungen', label: 'Einstellungen', icon: Settings },
]
