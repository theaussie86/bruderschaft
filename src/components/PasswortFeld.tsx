import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

// Passwortfeld mit Auge: Ein Tipp zeigt, was man eingegeben hat.
export function PasswortFeld(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
) {
  const [sichtbar, setSichtbar] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        className={`field pr-11 ${props.className ?? ''}`}
        type={sichtbar ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="text-smoke hover:text-ash absolute inset-y-0 right-0 flex w-11 items-center justify-center"
        aria-label={sichtbar ? 'Passwort verbergen' : 'Passwort anzeigen'}
        aria-pressed={sichtbar}
        onClick={() => setSichtbar((s) => !s)}
      >
        {sichtbar ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
