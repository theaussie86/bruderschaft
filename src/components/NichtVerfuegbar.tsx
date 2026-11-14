import { EyeOff } from 'lucide-react'

import { Markierung } from '@/components/Markierung'
import { NICHT_VERFUEGBAR } from '@/lib/verfuegbarkeit'

// Markierung einer Position, deren Artikel, Größe, Druckstelle oder Motiv
// der Admin inzwischen ausgeblendet hat. Die Position bleibt gültig.
export function NichtVerfuegbar() {
  return (
    <Markierung ton="brass">
      <EyeOff className="size-3" /> {NICHT_VERFUEGBAR}
    </Markierung>
  )
}
