import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

// PROTOTYP, wegwerfen. Schwebende Leiste zum Durchschalten von UI-Varianten
// über ?variant=. Erscheint nur im Dev-Build.
export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: Array<{ key: string; name: string }>
  current: string
}) {
  const navigate = useNavigate()
  const i = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )

  function gehe(schritt: number) {
    const next = variants[(i + schritt + variants.length) % variants.length]
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        variant: next.key,
      }),
      replace: true,
    } as never)
  }

  useEffect(() => {
    function taste(e: KeyboardEvent) {
      const el = document.activeElement
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      )
        return
      if (e.key === 'ArrowLeft') gehe(-1)
      if (e.key === 'ArrowRight') gehe(1)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  })

  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1.5 font-mono text-sm text-black shadow-2xl ring-2 ring-fuchsia-500 lg:bottom-6">
      <button
        type="button"
        onClick={() => gehe(-1)}
        className="rounded-full p-1.5 hover:bg-black/10"
        aria-label="Vorige Variante"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="px-2 whitespace-nowrap">
        {variants[i].key} ({variants[i].name})
      </span>
      <button
        type="button"
        onClick={() => gehe(1)}
        className="rounded-full p-1.5 hover:bg-black/10"
        aria-label="Nächste Variante"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
