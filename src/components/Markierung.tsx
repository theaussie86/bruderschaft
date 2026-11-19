const TOENE = {
  brass: 'border-brass/40 text-brass',
  patina: 'border-patina/40 text-patina',
  copper: 'border-copper/50 text-copper',
  neutral: 'border-line text-ash',
}

export function Markierung({
  ton,
  children,
}: {
  ton: keyof typeof TOENE
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${TOENE[ton]}`}
    >
      {children}
    </span>
  )
}
