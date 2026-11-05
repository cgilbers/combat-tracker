import { useState } from 'react'
import { Heart, Shield } from 'lucide-react'
import { Button } from '../../components/Button'
import { CountBadge } from '../../components/CountBadge'
import { TextInput } from '../../components/FormControls'
import { TypeBadge } from '../../components/TypeBadge'
import type { CombatantState } from '../../domain/types'

type InitiativeRowProps = {
  combatant: CombatantState
  isCurrentTurn: boolean
  isSelected: boolean
  canAdjustHp: boolean
  onSelect: () => void
  onAdjustCreatureHp: (
    combatantId: string,
    direction: 'damage' | 'heal',
    amount: string,
  ) => void
}

export function InitiativeRow({
  combatant,
  isCurrentTurn,
  isSelected,
  canAdjustHp,
  onSelect,
  onAdjustCreatureHp,
}: InitiativeRowProps) {
  const [hpAdjustment, setHpAdjustment] = useState('1')

  return (
    <div
      className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 border p-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_minmax(15rem,auto)] sm:gap-3 sm:p-4 ${
        isCurrentTurn ? 'border-accent/50 bg-accent-soft' : 'border-line bg-raised'
      } ${combatant.isDefeated ? 'opacity-50' : ''}`}
    >
      <CountBadge className="text-center">{combatant.initiative}</CountBadge>
      <TypeBadge type={combatant.type} />
      <div className="min-w-0">
        {combatant.type === 'creature' ? (
          <button
            type="button"
            aria-pressed={isSelected}
            className="group block min-w-0 text-left"
            onClick={onSelect}
          >
            <strong className="block truncate text-sm text-ink">
              {combatant.name}
            </strong>
            <small className="text-xs text-muted">
              {isSelected ? (
                'Selected creature'
              ) : (
                <>
                  Creature ·{' '}
                  <span className="group-hover:underline">view details</span>
                </>
              )}
            </small>
          </button>
        ) : (
          <>
            <strong className="block truncate text-sm text-ink">
              {combatant.name}
            </strong>
            <small className="text-xs text-muted">Player character</small>
          </>
        )}
      </div>
      {combatant.type === 'creature' ? (
        <>
          <div className="flex items-center gap-2 whitespace-nowrap text-sm">
            <span className="inline-flex items-center gap-1">
              <strong className="text-ink">{combatant.currentHp}</strong>
              <span className="text-xs text-muted">/ {combatant.maxHp}</span>
              <Heart
                aria-hidden="true"
                className="size-4 text-danger"
                strokeWidth={2}
              />
            </span>
            <span className="inline-flex items-center gap-1 text-muted">
              <strong className="text-ink">{combatant.ac}</strong>
              <Shield
                aria-hidden="true"
                className="size-4 text-yellow-400"
                strokeWidth={2}
              />
            </span>
          </div>
          {canAdjustHp && (
            <div className="col-span-full flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap sm:justify-end">
              <label
                className="font-mono text-[10px] text-muted"
                htmlFor={`hp-adjustment-${combatant.id}`}
              >
                Amount
              </label>
              <TextInput
                id={`hp-adjustment-${combatant.id}`}
                type="number"
                min="1"
                value={hpAdjustment}
                className="!w-16"
                onChange={(event) => setHpAdjustment(event.target.value)}
              />
              <Button
                variant="damage"
                onClick={() =>
                  onAdjustCreatureHp(combatant.id, 'damage', hpAdjustment)
                }
              >
                Damage
              </Button>
              <Button
                variant="heal"
                onClick={() =>
                  onAdjustCreatureHp(combatant.id, 'heal', hpAdjustment)
                }
              >
                Heal
              </Button>
            </div>
          )}
        </>
      ) : (
        <span className="hidden text-xs text-muted sm:block">HP / AC at table</span>
      )}
    </div>
  )
}
