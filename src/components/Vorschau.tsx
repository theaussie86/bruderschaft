import { ImageOff } from 'lucide-react'

import { bildPfad } from '@/lib/sortiment'

// Quadratisches Vorschaubild eines Artikels oder Motivs, ohne Bild ein Platzhalter.
export function Vorschau({
  eintrag,
}: {
  eintrag: { id: string; collectionId: string; bild: string }
}) {
  const src = bildPfad(eintrag, '200x200')
  return src ? (
    <img
      src={src}
      alt=""
      className="bg-coal size-16 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <div className="bg-coal text-smoke flex size-16 shrink-0 items-center justify-center rounded-lg">
      <ImageOff className="size-5" />
    </div>
  )
}
