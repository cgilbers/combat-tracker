import { useState } from 'react'
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
  onNextTurn: () => void
  onPause: () => void
  onComplete: () => void
  onAdjustCreatureHp: (
    combatantId: string,
    direction: 'damage' | 'heal',
    amount: string,
  ) => void
}

export function CombatPage({
  encounter,
  activeCombatantName,
  onNextTurn,
  onPause,
  onComplete,
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
          encounter?.status === 'active' ? 'border-lime/50' : ''
        }`}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <span className="font-mono text-[11px] tracking-[1.1px] text-lime">
              04 / COMBAT RUN
            </span>
            <h2 className="mt-2 font-display text-[26px] leading-tight font-medium text-ink">
              {encounter?.name ?? 'No encounter selected'}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            {encounter?.status === 'active' && (
              <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[1px] text-lime">
                <i className="size-2 rounded-full bg-lime" /> LIVE
              </span>
            )}
          </div>
        </div>
        {!encounter && (
          <div className="grid min-h-80 place-content-center justify-items-center text-center">
            <div className="mb-4 font-display text-4xl text-lime" aria-hidden="true">
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
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border border-line bg-panel p-4">
            <div>
              <span className="font-mono text-[10px] tracking-[1px] text-lime">
                NOW ACTING
              </span>
              <strong className="mt-1 block font-display text-xl text-ink">
                {activeCombatantName}
              </strong>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={onNextTurn}>
                Next turn <span aria-hidden="true">→</span>
              </Button>
              <Button onClick={onPause}>Pause</Button>
              <Button variant="danger" onClick={onComplete}>
                Complete
              </Button>
            </div>
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
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:p-4 ${
                    index === encounter.currentTurnIndex
                      ? 'border-lime/50 bg-[#20271e]'
                      : 'border-line bg-panel'
                  } ${combatant.isDefeated ? 'opacity-50' : ''}`}
                  key={combatant.id}
                >
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
                  <CountBadge className="text-center">{combatant.initiative}</CountBadge>
                  {combatant.type === 'creature' ? (
                    <div className="col-span-3 grid grid-cols-2 items-center gap-2 border-t border-line pt-3 sm:col-span-1 sm:grid-cols-1 sm:border-0 sm:pt-0">
                      <div className="text-sm">
                        <strong className="text-ink">{combatant.currentHp}</strong>
                        <span className="ml-1 text-xs text-muted">
                          / {combatant.maxHp} HP · AC {combatant.ac}
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
