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
    'rounded-md border border-line bg-transparent px-3 py-2 font-sans text-xs font-medium text-muted hover:border-accent hover:text-accent',
  primary:
    'rounded-md bg-accent px-4 py-3 font-sans text-sm font-semibold text-accent-contrast hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-35',
  ghost: 'rounded-md bg-transparent px-0 py-2 font-sans text-sm font-medium text-accent hover:text-ink',
  danger: 'rounded-md bg-transparent px-0 py-2 font-sans text-sm font-medium text-danger hover:text-ink',
  icon: 'grid size-10 place-items-center rounded-md bg-accent text-xl text-accent-contrast hover:bg-accent/90',
  damage:
    'rounded-md border border-line bg-accent-soft px-2 py-2 font-sans text-xs font-semibold text-ink hover:bg-accent/20',
  heal: 'rounded-md border border-line bg-teal px-2 py-2 font-sans text-xs font-semibold text-ink hover:bg-teal/90',
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
