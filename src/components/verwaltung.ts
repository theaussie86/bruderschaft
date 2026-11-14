import { Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Bereiche der Verwaltung, nur für Admins. Sidebar und Profil zeigen dieselbe
// Liste.
export const VERWALTUNG_LINKS: Array<{
  to: '/verwaltung/mitglieder'
  label: string
  icon: LucideIcon
}> = [{ to: '/verwaltung/mitglieder', label: 'Mitglieder', icon: Users }]
