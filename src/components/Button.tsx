import type { ButtonHTMLAttributes } from 'react'

export function Button({
  full,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }) {
  return (
    <button
      {...rest}
      className={`bg-rust text-bone hover:bg-rust-hi disabled:bg-slate disabled:text-smoke inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-all active:translate-y-px disabled:cursor-not-allowed ${
        full ? 'w-full' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}
