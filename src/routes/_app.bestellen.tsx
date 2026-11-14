import { createFileRoute } from '@tanstack/react-router'
import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { SortimentArtikel } from '@/lib/sortiment'
import { PageHeader } from '@/components/PageHeader'
import { fehlertext } from '@/lib/geburtstag'
import { euro } from '@/lib/geld'
import { bildPfad, ladeSortiment } from '@/lib/sortiment'

export const Route = createFileRoute('/_app/bestellen')({
  component: Bestellen,
})

function Bestellen() {
  return (
    <>
      <PageHeader title="Bestellen" />
      <SortimentAnsicht />
    </>
  )
}

// Das Sortiment, wie Mitglieder es sehen: nur eingeblendete Artikel und
// Größen, ohne Artikelnummer (die ist nur für den Drucker).
function SortimentAnsicht() {
  const [liste, setListe] = useState<Array<SortimentArtikel> | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    ladeSortiment()
      .then((alle) => setListe(alle.filter((a) => !a.ausgeblendet)))
      .catch((err: unknown) =>
        setFehler(
          fehlertext(err, 'Das Sortiment konnte nicht geladen werden.'),
        ),
      )
  }, [])

  if (fehler)
    return (
      <p role="alert" className="text-rust-hi text-sm">
        {fehler}
      </p>
    )
  if (liste === null) return <p className="text-ash">Lädt …</p>
  if (liste.length === 0) return null

  return (
    <section aria-label="Sortiment">
      <div className="eyebrow mb-3">Sortiment</div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {liste.map((a) => {
          const src = bildPfad(a, '800x0')
          const groessen = a.groessen.filter((g) => !g.ausgeblendet)
          return (
            <li key={a.id} className="card overflow-hidden">
              {src ? (
                <img
                  src={src}
                  alt={a.name}
                  className="bg-coal aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="bg-coal text-smoke flex aspect-[4/3] items-center justify-center">
                  <ImageOff className="size-6" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 font-semibold">{a.name}</span>
                  <span className="tnum font-semibold">{euro(a.preis)}</span>
                </div>
                {a.beschreibung && (
                  <p className="text-ash mt-1 text-[14px]">{a.beschreibung}</p>
                )}
                {groessen.length > 0 && (
                  <p className="text-ash mt-2 text-[13px]">
                    Größen:{' '}
                    {groessen
                      .map((g) =>
                        g.aufpreis
                          ? `${g.name} (+${euro(g.aufpreis)})`
                          : g.name,
                      )
                      .join(', ')}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
