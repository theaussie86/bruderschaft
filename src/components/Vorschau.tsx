import { ImageOff } from 'lucide-react'

import { bildPfad } from '@/lib/sortiment'

// Quadratisches Vorschaubild eines Artikels oder Motivs, ganz eingepasst statt
// beschnitten, ohne Bild ein Platzhalter.
export function Vorschau({
  eintrag,
}: {
  eintrag: { id: string; collectionId: string; bild: string }
}) {
  const src = bildPfad(eintrag, '200x200f')
  return src ? (
    <img
      src={src}
      alt=""
      className="bg-coal size-16 shrink-0 rounded-lg object-contain"
    />
  ) : (
    <div className="bg-coal text-smoke flex size-16 shrink-0 items-center justify-center rounded-lg">
      <ImageOff className="size-5" />
    </div>
  )
}
