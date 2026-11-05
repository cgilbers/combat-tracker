import { useState } from 'react'
import { Heart, Shield } from 'lucide-react'
import { Button } from '../components/Button'
import { CountBadge } from '../components/CountBadge'
import { CreatureDetailsPanel } from '../components/CreatureDetailsPanel'
import { TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { TypeBadge } from '../components/TypeBadge'
import type { Encounter } from '../domain/types'

type CombatPageProps = {
  encounter: Encounter | null
  activeCombatantName?: string
  activeCombatantInitiative?: number | null
  onNextTurn: () => void
  onAdjustCreatureHp: (
    combatantId: string,
    direction: 'damage' | 'heal',
    amount: string,
  ) => void
}

export function CombatPage({
  encounter,
  activeCombatantName,
  activeCombatantInitiative,
  onNextTurn,
  onAdjustCreatureHp,
}: CombatPageProps) {
  const [hpAdjustment, setHpAdjustment] = useState('1')
  const [selectedCombatantId, setSelectedCombatantId] = useState('')
  const creatureCombatants =
    encounter?.combatants.filter((combatant) => combatant.type === 'creature') ?? []
  const selectedCombatant =
    creatureCombatants.find((combatant) => combatant.id === selectedCombatantId) ??
    creatureCombatants.find(
      (combatant) => combatant.id === encounter?.combatants[encounter.currentTurnIndex]?.id,
    ) ??
    creatureCombatants[0]
  const selectedCreature = selectedCombatant
    ? encounter?.creatureSnapshots[selectedCombatant.refId]
    : undefined

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3 overflow-hidden xl:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)] xl:grid-rows-1 xl:gap-5">
      <Panel
        variant="combat"
        className={`flex h-full min-h-0 flex-col overflow-hidden ${
          encounter?.status === 'active' ? 'border-accent/50' : ''
        }`}
      >
        {!encounter && (
          <div className="grid min-h-80 place-content-center justify-items-center text-center">
            <div className="mb-4 font-display text-4xl text-accent" aria-hidden="true">
              ✦
            </div>
            <h3 className="font-display text-xl text-ink">No encounter selected.</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Select an encounter from Encounters to begin or resume combat.
            </p>
          </div>
        )}
        {encounter?.status === 'complete' && (
          <p className="mb-5 text-sm text-muted">
            This encounter is complete and retained as history.
          </p>
        )}
        {encounter?.status === 'paused' && (
          <p className="mb-5 text-sm text-muted">
            This encounter is paused. Return to Encounters to resume it.
          </p>
        )}
        {encounter?.status === 'active' && (
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border border-accent/50 bg-accent-soft p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="min-w-0">
                <span className="font-mono text-[11px] font-semibold tracking-[1.4px] text-accent">
                  NOW ACTING
                </span>
                <strong className="mt-1 block truncate font-display text-2xl text-ink">
                  {activeCombatantName}
                </strong>
              </div>
              <div className="shrink-0 border-l border-accent/30 pl-4">
                <span className="block font-mono text-[9px] tracking-[1px] text-muted">
                  INITIATIVE
                </span>
                <strong className="block font-mono text-2xl leading-tight text-accent">
                  {activeCombatantInitiative ?? '—'}
                </strong>
              </div>
            </div>
            <Button variant="primary" onClick={onNextTurn}>
              Next turn <span aria-hidden="true">→</span>
            </Button>
          </div>
        )}
        {encounter && encounter.combatants.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 font-mono text-[10px] tracking-[1px] text-muted">
              INITIATIVE ORDER
            </h3>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {encounter.combatants.map((combatant, index) => (
                <div
                  className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 border p-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:p-4 ${
                    index === encounter.currentTurnIndex
                      ? 'border-accent/50 bg-accent-soft'
                      : 'border-line bg-raised'
                  } ${combatant.isDefeated ? 'opacity-50' : ''}`}
                  key={combatant.id}
                >
                  <CountBadge className="text-center">{combatant.initiative}</CountBadge>
                  <TypeBadge type={combatant.type} />
                  <div className="min-w-0">
                    {combatant.type === 'creature' ? (
                      <button
                        type="button"
                        aria-pressed={selectedCombatant?.id === combatant.id}
                        className="block min-w-0 text-left"
                        onClick={() => setSelectedCombatantId(combatant.id)}
                      >
                        <strong className="block truncate text-sm text-ink">
                          {combatant.name}
                        </strong>
                        <small className="text-xs text-muted">
                          {selectedCombatant?.id === combatant.id
                            ? 'Selected creature'
                            : 'Creature · view details'}
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
                    <div className="col-span-3 grid grid-cols-2 items-center gap-2 border-t border-line pt-3 sm:col-span-1 sm:grid-cols-1 sm:border-0 sm:pt-0">
                      <div className="flex items-center gap-3 text-sm">
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
                            className="size-4 text-teal"
                            strokeWidth={2}
                          />
                        </span>
                      </div>
                      {encounter.status === 'active' && (
                        <div className="col-span-2 grid grid-cols-[auto_minmax(3rem,1fr)_auto_auto] items-center gap-2 sm:col-span-1">
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
                    </div>
                  ) : (
                    <span className="hidden text-xs text-muted sm:block">HP / AC at table</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
      {encounter && (
        <CreatureDetailsPanel
          creature={selectedCreature}
          combatant={selectedCombatant}
        />
      )}
    </div>
  )
}
