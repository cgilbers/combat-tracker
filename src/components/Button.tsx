import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant =
  | 'secondary'
  | 'primary'
  | 'ghost'
  | 'danger'
  | 'icon'
  | 'damage'
  | 'heal'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  secondary:
    'border border-line bg-transparent px-3 py-2 font-mono text-[10px] text-muted hover:border-accent hover:text-accent',
  primary:
    'bg-accent px-4 py-3 font-mono text-xs text-accent-contrast hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-35',
  ghost: 'bg-transparent px-0 py-2 font-mono text-xs text-accent hover:text-ink',
  danger: 'bg-transparent px-0 py-2 font-mono text-xs text-danger hover:text-ink',
  icon: 'grid size-10 place-items-center bg-accent text-xl text-accent-contrast hover:bg-accent/90',
  damage:
    'border border-line bg-accent-soft px-2 py-2 font-mono text-[10px] text-ink hover:bg-accent/20',
  heal: 'border border-line bg-teal px-2 py-2 font-mono text-[10px] text-ink hover:bg-teal/90',
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight disabled:cursor-not-allowed disabled:opacity-35 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
