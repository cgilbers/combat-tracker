import { useState } from 'react'
import { Button } from '../components/Button'
import { CreatureDetailsPanel } from '../components/CreatureDetailsPanel'
import { Panel } from '../components/Panel'
import type { Encounter } from '../domain/types'
import { InitiativeRow } from './combat/InitiativeRow'

type CombatPageProps = {
  encounter: Encounter | null
  activeCombatantName?: string
  activeCombatantInitiative?: number | null
  onNextTurn: () => void
  onDelayTurn: (combatantId: string) => void
  onResumeTurn: (combatantId: string) => void
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
  onDelayTurn,
  onResumeTurn,
  onAdjustCreatureHp,
}: CombatPageProps) {
  const [selectedCombatantId, setSelectedCombatantId] = useState('')
  const currentCombatant =
    encounter?.combatants[encounter.currentTurnIndex]
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
        {encounter?.status === 'active' && currentCombatant && (
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
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => currentCombatant && onDelayTurn(currentCombatant.id)}
                disabled={currentCombatant.isDefeated}
              >
                Delay turn
              </Button>
              <Button variant="primary" onClick={onNextTurn}>
                Next turn <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        )}
        {encounter &&
          (encounter.combatants.length > 0 ||
            (encounter.status === 'active' &&
              (encounter.delayedCombatants?.length ?? 0) > 0)) && (
          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 font-mono text-[10px] tracking-[1px] text-muted">
              INITIATIVE ORDER
            </h3>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {encounter.status === 'active' && !currentCombatant && (
                <p className="border border-line bg-raised p-3 text-sm text-muted">
                  No active combatants. Resume a delayed turn to continue.
                </p>
              )}
              {encounter.combatants.map((combatant, index) => (
                <InitiativeRow
                  key={combatant.id}
                  combatant={combatant}
                  isCurrentTurn={index === encounter.currentTurnIndex}
                  isSelected={selectedCombatant?.id === combatant.id}
                  canAdjustHp={encounter.status === 'active'}
                  onSelect={() => setSelectedCombatantId(combatant.id)}
                  onAdjustCreatureHp={onAdjustCreatureHp}
                />
              ))}
              {encounter.status === 'active' &&
                encounter.delayedCombatants?.map((combatant) => {
                  return (
                    <div
                      key={combatant.id}
                      className="flex flex-wrap items-center gap-3 border border-accent/40 bg-raised p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-ink">
                          {combatant.name}
                        </strong>
                        <small className="text-xs text-muted">Delayed</small>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => onResumeTurn(combatant.id)}
                      >
                        Resume before {currentCombatant?.name ?? 'next turn'}
                      </Button>
                    </div>
                  )
                })}
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
