import type { HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div'
  variant?: 'default' | 'builder' | 'combat'
}

const variantClasses = {
  default: 'border-line bg-panel p-5 sm:p-6',
  builder: 'border-line bg-[#222923] p-5 sm:p-6',
  combat: 'min-h-[30rem] border-line bg-[#171b19] p-5 sm:min-h-[38.75rem] sm:p-[30px]',
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
