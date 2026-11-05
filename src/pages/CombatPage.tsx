import { Button } from '../components/Button'
import { CountBadge } from '../components/CountBadge'
import { TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { TypeBadge } from '../components/TypeBadge'
import type { Encounter } from '../domain/types'

type CombatPageProps = {
  encounter: Encounter | null
  hpAdjustment: string
  activeCombatantName?: string
  onHpAdjustmentChange: (value: string) => void
  onNextTurn: () => void
  onPause: () => void
  onComplete: () => void
  onAdjustCreatureHp: (combatantId: string, direction: 'damage' | 'heal') => void
  onBackToEncounters: () => void
}

export function CombatPage({
  encounter,
  hpAdjustment,
  activeCombatantName,
  onHpAdjustmentChange,
  onNextTurn,
  onPause,
  onComplete,
  onAdjustCreatureHp,
  onBackToEncounters,
}: CombatPageProps) {
  return (
    <Panel
      variant="combat"
      className={encounter?.status === 'active' ? 'border-lime/50' : ''}
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
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
          <Button onClick={onBackToEncounters}>Back to encounters</Button>
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
        <p className="text-sm text-muted">
          This encounter is complete and retained as history.
        </p>
      )}
      {encounter?.status === 'paused' && (
        <p className="text-sm text-muted">
          This encounter is paused. Return to Encounters to resume it.
        </p>
      )}
      {encounter?.status === 'active' && (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border border-line bg-panel p-4">
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
          <div className="space-y-3">
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
                  <strong className="block truncate text-sm text-ink">{combatant.name}</strong>
                  <small className="text-xs text-muted">
                    {combatant.type === 'pc' ? 'Player character' : 'Creature'}
                  </small>
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
                        onChange={(event) => onHpAdjustmentChange(event.target.value)}
                      />
                      <Button
                        variant="damage"
                        onClick={() => onAdjustCreatureHp(combatant.id, 'damage')}
                      >
                        Damage
                      </Button>
                      <Button
                        variant="heal"
                        onClick={() => onAdjustCreatureHp(combatant.id, 'heal')}
                      >
                        Heal
                      </Button>
                    </div>
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
  )
}
