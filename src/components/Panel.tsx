import type { HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div'
  variant?: 'default' | 'builder' | 'combat'
}

export function Panel({
  as: Element = 'section',
  variant = 'default',
  className = '',
  ...props
}: PanelProps) {
  return (
    <Element
      className={`rounded-lg border border-line p-5 shadow-sm shadow-night/10 sm:p-6 ${
        variant === 'builder' ? 'bg-raised' : 'bg-panel'
      } ${className}`}
      {...props}
    />
  )
}
