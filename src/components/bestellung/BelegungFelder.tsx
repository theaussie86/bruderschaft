import { Check, ImageOff } from 'lucide-react'

import type { Wahl } from '@/lib/belegung'
import type { Druckstelle, Motiv } from '@/lib/sortiment'
import { Markierung } from '@/components/Markierung'
import { waehlbareDruckstellen, waehlbareMotive } from '@/lib/belegung'
import { euro } from '@/lib/geld'
import { bildPfad } from '@/lib/sortiment'

// Pro wählbarer Druckstelle eines Artikels: Motiv als Kachel wählen oder
// eigenen Text eintragen. Eine optionale Druckstelle darf leer bleiben.
export function BelegungFelder({
  druckstellen,
  motive,
  wahl,
  onWahl,
}: {
  druckstellen: Array<Druckstelle>
  motive: Array<Motiv>
  wahl: Wahl
  onWahl: (wahl: Wahl) => void
}) {
  function setzen(id: string, eintrag: Wahl[string] | undefined) {
    const neu = { ...wahl }
    if (eintrag) neu[id] = eintrag
    else delete neu[id]
    onWahl(neu)
  }

  return (
    <>
      {waehlbareDruckstellen(druckstellen).map((d) => {
        const eintrag = wahl[d.id]
        return (
          <fieldset key={d.id} className="block">
            <legend className="mb-1.5 flex w-full items-center gap-2 text-sm">
              <span className="text-ash flex-1">Druckstelle {d.name}</span>
              {d.aufpreis > 0 && (
                <span className="tnum text-brass text-[12px]">
                  +{euro(d.aufpreis)}
                </span>
              )}
              <Markierung ton={d.pflicht ? 'brass' : 'neutral'}>
                {d.pflicht ? 'Pflicht' : 'optional'}
              </Markierung>
            </legend>
            {d.art === 'text' ? (
              <input
                className="field"
                maxLength={50}
                required={d.pflicht}
                placeholder="z. B. dein Spitzname"
                aria-label={`Text für ${d.name}`}
                value={eintrag?.text ?? ''}
                onChange={(e) =>
                  setzen(
                    d.id,
                    e.target.value ? { text: e.target.value } : undefined,
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {!d.pflicht && (
                  <Kachel
                    aktiv={!eintrag?.motiv}
                    onClick={() => setzen(d.id, undefined)}
                  >
                    <span className="text-ash flex aspect-square items-center justify-center text-[13px] font-semibold">
                      leer lassen
                    </span>
                  </Kachel>
                )}
                {waehlbareMotive(d, motive).map((m) => {
                  const src = bildPfad(m, '200x200')
                  return (
                    <Kachel
                      key={m.id}
                      aktiv={eintrag?.motiv === m.id}
                      onClick={() => setzen(d.id, { motiv: m.id })}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className="bg-coal aspect-square w-full object-cover"
                        />
                      ) : (
                        <span className="bg-coal text-smoke flex aspect-square items-center justify-center">
                          <ImageOff className="size-5" />
                        </span>
                      )}
                      <span className="bg-coal block truncate px-2 py-1.5 text-[12px] font-semibold">
                        {m.name}
                      </span>
                    </Kachel>
                  )
                })}
              </div>
            )}
          </fieldset>
        )
      })}
    </>
  )
}

function Kachel({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={aktiv}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border text-left transition-all ${
        aktiv
          ? 'border-brass shadow-[0_0_0_2px_var(--color-brass)]'
          : 'border-line hover:border-ash/50'
      }`}
    >
      {children}
      {aktiv && (
        <span className="bg-brass text-coal absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
