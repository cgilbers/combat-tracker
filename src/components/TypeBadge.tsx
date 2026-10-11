type TypeBadgeProps = {
  type: 'pc' | 'creature'
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      aria-label={type === 'pc' ? 'Player character' : 'Creature'}
      className={`grid size-8 shrink-0 place-items-center font-mono text-[11px] ${
        type === 'pc'
          ? 'border border-line bg-transparent text-muted'
          : 'bg-lime text-night'
      }`}
    >
      {type === 'pc' ? 'P' : 'C'}
    </span>
  )
}
