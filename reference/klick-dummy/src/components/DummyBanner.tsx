import { useEffect } from 'react'
import { actions, useApp } from '../mock/store'
import type { Role } from '../mock/store'

/** Steuerleiste des Klick-Dummys. Absichtlich anders gestaltet als die App. */
export function DummyBanner() {
  const { role } = useApp()
  useEffect(() => actions.restoreRole(), [])
  const opts: Array<[Role, string]> = [
    ['mitglied', 'Mitglied'],
    ['admin', 'Admin'],
  ]
  return (
    <div
      className="pt-safe sticky top-0 z-50 text-coal"
      style={{
        background:
          'repeating-linear-gradient(-45deg, #e8dcc4 0 10px, #e2d4b8 10px 20px)',
        boxShadow: '0 1px 0 rgb(0 0 0 / .4)',
      }}
    >
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-3 px-3 text-[13px]">
        <span className="flex items-center gap-2 font-semibold">
          <span className="rounded-[4px] border border-coal/70 px-1.5 py-px font-display text-[12px] font-extrabold tracking-[0.14em] uppercase">
            Klick-Dummy
          </span>
          <span className="hidden text-coal/70 sm:inline">Nichts wird gespeichert, Reload setzt zurück.</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-coal/70">Ansicht</span>
          <span className="flex rounded-full border border-coal/60 p-0.5" role="radiogroup" aria-label="Ansicht wählen">
            {opts.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={role === id}
                onClick={() => actions.setRole(id)}
                className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
                  role === id ? 'bg-coal text-[#e8dcc4]' : 'text-coal/80 hover:text-coal'
                }`}
              >
                {label}
              </button>
            ))}
          </span>
        </span>
      </div>
    </div>
  )
}
