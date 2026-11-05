import type { HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div'
  variant?: 'default' | 'builder' | 'combat'
}

const variantClasses = {
  default: 'border-line bg-panel p-5 sm:p-6',
  builder: 'border-line bg-[#222923] p-5 sm:p-6',
  combat: 'border-line bg-[#171b19] p-4 sm:p-6',
}

export function Panel({
  as: Element = 'section',
  variant = 'default',
  className = '',
  ...props
}: PanelProps) {
  return (
    <Element
      className={`border ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
