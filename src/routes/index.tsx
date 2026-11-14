import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ClubImage } from '../components/ui'
import { PublicFooter } from '../components/PublicPage'
import { asset } from '../mock/data'
import { useApp } from '../mock/store'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { settings } = useApp()
  return (
    <div className="relative flex min-h-[calc(100dvh-2.5rem)] flex-col overflow-hidden">
      {/* Holztafel als Atmosphäre im Hintergrund */}
      <div className="pointer-events-none absolute inset-0">
        <ClubImage src={asset('archiv-tafel.jpg')} alt="" className="size-full opacity-[0.16] blur-[1px] saturate-[.7]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_35%,transparent,var(--color-iron)_85%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-8 text-center">
        <div className="animate-rise relative mix-blend-lighten">
          <div className="absolute inset-12 rounded-full bg-rust/20 blur-3xl" />
          <ClubImage
            src={asset('logo-dunkel.jpg')}
            alt="Club-Logo"
            fallbackLabel="Club-Logo"
            className="relative h-[300px] w-[225px]"
          />
        </div>

        <div className="eyebrow animate-rise mt-2 [animation-delay:120ms]">Est. 1999</div>
        <h1 className="animate-rise mt-2 font-display text-5xl leading-[0.9] font-black uppercase [animation-delay:180ms]">
          Willkommen
          <br />
          im Club
        </h1>
        <p className="animate-rise mt-5 max-w-xs text-[16px] leading-relaxed text-ash [animation-delay:240ms]">{settings.homeText}</p>

        <div className="animate-rise mt-9 w-full [animation-delay:320ms]">
          <Link
            to="/login"
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-rust text-[17px] font-semibold text-bone shadow-[0_14px_30px_-12px_rgb(184_55_31/.9)] transition-colors hover:bg-rust-hi"
          >
            Anmelden
            <ArrowRight className="size-5" />
          </Link>
          <p className="mt-3 text-sm text-smoke">Zugänge vergibt der Vorstand. Eine Registrierung gibt es nicht.</p>
        </div>
      </div>
      <div className="relative">
        <PublicFooter />
      </div>
    </div>
  )
}
