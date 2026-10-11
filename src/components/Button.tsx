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
    'border border-line bg-transparent px-3 py-2 font-mono text-[10px] text-muted hover:border-lime hover:text-lime',
  primary:
    'bg-lime px-4 py-3 font-mono text-xs text-night hover:bg-lime/90 disabled:cursor-not-allowed disabled:opacity-35',
  ghost: 'bg-transparent px-0 py-2 font-mono text-xs text-lime hover:text-ink',
  danger: 'bg-transparent px-0 py-2 font-mono text-xs text-orange hover:text-ink',
  icon: 'grid size-10 place-items-center bg-lime text-xl text-night hover:bg-lime/90',
  damage:
    'border border-line bg-[#673d31] px-2 py-2 font-mono text-[10px] text-ink hover:bg-[#7a493a]',
  heal: 'border border-line bg-lime px-2 py-2 font-mono text-[10px] text-night hover:bg-lime/90',
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
