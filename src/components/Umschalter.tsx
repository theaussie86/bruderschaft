// Umschalter zwischen zwei oder mehr Ansichten, z. B. "Kommend / Archiv".
export function Umschalter<T extends string>({
  wert,
  onWechsel,
  optionen,
}: {
  wert: T
  onWechsel: (w: T) => void
  optionen: Array<[T, string]>
}) {
  return (
    <div
      className="border-line bg-coal flex rounded-2xl border p-1"
      role="tablist"
    >
      {optionen.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={wert === id}
          onClick={() => onWechsel(id)}
          className={`min-h-10 flex-1 rounded-xl text-[15px] font-semibold transition-all ${
            wert === id
              ? 'bg-slate text-bone shadow-[0_1px_0_rgb(255_255_255/.06)_inset]'
              : 'text-ash hover:text-bone'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
