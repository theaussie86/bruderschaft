// PROTOTYP, wegwerfen. Kleinkram, den alle drei Protokoll-Varianten nutzen:
// Umschalter Admin/Mitglied, Anzeige des Zustands, Beispieldaten. Nichts
// davon speichert, alles lebt im Speicher.

export function SichtUmschalter({
  alsMitglied,
  setAlsMitglied,
}: {
  alsMitglied: boolean
  setAlsMitglied: (v: boolean) => void
}) {
  return (
    <div className="mb-3 flex items-center gap-2 font-mono text-xs text-fuchsia-300">
      <span>PROTOTYP · Sicht:</span>
      {(
        [
          [false, 'Admin (schreibt)'],
          [true, 'Mitglied (liest)'],
        ] as const
      ).map(([wert, name]) => (
        <button
          key={name}
          type="button"
          onClick={() => setAlsMitglied(wert)}
          className={`rounded-full border px-2.5 py-1 ${
            alsMitglied === wert
              ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100'
              : 'border-fuchsia-500/30'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export function Zustand({ wert }: { wert: unknown }) {
  return (
    <details className="mt-4 rounded-xl border border-fuchsia-500/30 p-3 font-mono text-xs text-fuchsia-200">
      <summary className="cursor-pointer">
        PROTOTYP · Was gespeichert würde
      </summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(wert, null, 2)}
      </pre>
    </details>
  )
}

export function uhrzeit(d = new Date()) {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export const BEISPIEL_DATEIEN = ['Datei 1 · Foto']
