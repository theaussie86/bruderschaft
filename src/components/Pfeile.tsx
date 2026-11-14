import { ChevronDown, ChevronUp } from 'lucide-react'

// Pfeile, mit denen der Admin einen Eintrag (Artikel, Größe, Druckstelle,
// Motiv) in seiner Reihenfolge eine Stelle nach oben oder unten schiebt.
export function Pfeile({
  name,
  oben,
  unten,
  onVerschieben,
}: {
  name: string
  oben: boolean
  unten: boolean
  onVerschieben: (richtung: -1 | 1) => void
}) {
  const klasse =
    'text-smoke hover:text-bone disabled:opacity-25 flex size-7 items-center justify-center rounded-md'
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        className={klasse}
        disabled={!oben}
        aria-label={`${name} nach oben`}
        onClick={() => onVerschieben(-1)}
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        className={klasse}
        disabled={!unten}
        aria-label={`${name} nach unten`}
        onClick={() => onVerschieben(1)}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  )
}
