import type { ReactNode } from 'react'
import { CountBadge } from './CountBadge'

type SectionHeadingProps = {
  step: string
  title: string
  count?: ReactNode
  trailing?: ReactNode
}

export function SectionHeading({
  step,
  title,
  count,
  trailing,
}: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-5">
      <div>
        <span className="font-mono text-[11px] tracking-[1.1px] text-accent">
          {step}
        </span>
        <h2 className="mt-2 font-hero text-[26px] leading-tight text-ink">
          {title}
        </h2>
      </div>
      {count && <CountBadge>{count}</CountBadge>}
      {trailing}
    </div>
  )
}
