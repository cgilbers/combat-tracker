import type { HTMLAttributes } from 'react'

export function CountBadge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`shrink-0 border border-line px-2 py-1.5 font-mono text-[11px] text-muted ${className}`}
      {...props}
    />
  )
}
