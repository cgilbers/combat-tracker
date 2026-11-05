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
      className={`border border-line bg-panel p-5 sm:p-6 ${className}`}
      {...props}
    />
  )
}
