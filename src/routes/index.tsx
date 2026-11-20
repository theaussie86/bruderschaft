import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { MapPin } from 'lucide-react'

import { PublicFooter } from '@/components/PublicPage'
import { Kopf } from '@/components/rocknacht/Kopf'
import { createPocketBase } from '@/lib/pocketbase'
import { HAHNA_BROTHERS, ROCKNACHT as R } from '@/lib/rocknacht'
import { ladeStartseite } from '@/lib/startseite'

// Der Absatz über die Hahna Brothers kommt aus den Einstellungen und ist
// öffentlich lesbar, deshalb ohne Token. Ist er leer oder PocketBase nicht
// erreichbar, steht der Vorgabesatz da.
const ladeText = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return (await ladeStartseite(createPocketBase()))?.text.trim() ?? ''
  } catch {
    return ''
  }
})

// Öffentliche Startseite: gehört der Rocknacht Ottobeuren, der Login ist eine
// eigene Seite. Scheinwerferkegel von oben, im Zentrum ein Ticket mit dem
// nächsten Termin, darunter ein Lauftext mit dem Line-up.
export const Route = createFileRoute('/')({
  loader: () => ladeText(),
  component: Startseite,
})

function Startseite() {
  const text = Route.useLoaderData()
  const { mitglied } = Route.useRouteContext()
  const lauftext = R.naechste.bands.length
    ? R.naechste.bands
    : ['Line-up coming soon']
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[90dvh]"
        style={{
          background:
            'conic-gradient(from 180deg at 50% -8%, transparent 158deg, rgb(200 157 92 / 0.16) 172deg, rgb(237 228 211 / 0.10) 180deg, rgb(200 157 92 / 0.16) 188deg, transparent 202deg)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
        }}
      />
      <Kopf mitgliedAngemeldet={!!mitglied} className="relative" />

      <main className="relative flex-1">
        <section className="mx-auto max-w-xl px-5 pt-16 pb-12 text-center">
          <h1 className="font-display text-[clamp(3.5rem,14vw,7.5rem)] leading-[0.85] font-black uppercase">
            Rocknacht
          </h1>
          <p className="text-brass font-display mt-2 text-xl font-bold tracking-[0.35em] uppercase">
            Ottobeuren
          </p>

          <div className="bg-bone text-coal relative mx-auto mt-12 flex max-w-sm rounded-xl text-left shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
            <div className="flex-1 p-5">
              <p className="font-display text-xs font-bold tracking-[0.2em] uppercase opacity-60">
                Nächste Rocknacht
              </p>
              <p className="font-display mt-1 text-5xl leading-none font-black">
                {R.naechste.jahr}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {R.naechste.datum ?? 'Termin folgt, Sommer im Unterallgäu'}
              </p>
              <p className="mt-3 text-xs opacity-70">
                {R.ort.name}, {R.ort.plz_ort} · ab {R.ab}
              </p>
            </div>
            <div className="border-coal/30 relative w-20 border-l-2 border-dashed">
              <span className="bg-iron absolute -top-3 -left-3 size-6 rounded-full" />
              <span className="bg-iron absolute -bottom-3 -left-3 size-6 rounded-full" />
              <p className="font-display absolute inset-0 flex items-center justify-center text-sm font-black tracking-[0.3em] uppercase [writing-mode:vertical-rl]">
                Eintritt
              </p>
            </div>
          </div>
        </section>

        <section
          aria-label={`Line-up ${R.naechste.jahr}`}
          className="border-line bg-coal/60 overflow-hidden border-y py-5"
        >
          <div className="flex w-max animate-[lauf_30s_linear_infinite] gap-10 motion-reduce:animate-none">
            {Array.from({ length: 4 }, () => lauftext)
              .flat()
              .map((band, i) => (
                <span
                  key={i}
                  aria-hidden={i >= lauftext.length}
                  className="font-display text-ash flex items-center gap-10 text-4xl font-black whitespace-nowrap uppercase"
                >
                  {band}
                  <span className="text-rust">✦</span>
                </span>
              ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">Rückblick {R.letzte.jahr}</p>
            <p className="font-display mt-3 text-4xl leading-tight font-black uppercase">
              {R.zitat.text}
            </p>
            <p className="text-smoke mt-2 text-sm">{R.zitat.quelle}</p>
            <p className="text-ash mt-6 leading-relaxed">{R.rueckblick}</p>
          </div>
          <dl className="card divide-line divide-y self-start">
            <Zeile titel="Zuletzt">{R.letzte.datum}</Zeile>
            <Zeile titel="Bands">{R.letzte.bands.join(', ')}</Zeile>
            <Zeile titel="Ablauf">
              Einlass {R.letzte.einlass}, Bühne ab {R.letzte.beginn}
            </Zeile>
            <Zeile titel="Vorverkauf">{R.vorverkauf.join(', ')}</Zeile>
            <Zeile titel="Ort">
              <a
                href={R.ort.karte}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brass inline-flex items-center gap-1.5"
              >
                <MapPin className="size-4" strokeWidth={2} />
                {R.ort.strasse}
              </a>
            </Zeile>
          </dl>
        </section>

        <section className="border-line mx-auto max-w-5xl border-t px-5 py-14 text-center">
          <img
            src="/club-assets/brand/logo.webp"
            alt="Logo der Hahna Brothers"
            className="mx-auto w-32"
          />
          <p className="text-ash mx-auto mt-4 max-w-md leading-relaxed whitespace-pre-line">
            {text || HAHNA_BROTHERS.satz}
          </p>
        </section>
      </main>

      <PublicFooter />
      <style>{`@keyframes lauf { to { transform: translateX(-50%); } }`}</style>
    </div>
  )
}

function Zeile({
  titel,
  children,
}: {
  titel: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 px-5 py-4">
      <dt className="eyebrow w-24 shrink-0 pt-0.5">{titel}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  )
}
