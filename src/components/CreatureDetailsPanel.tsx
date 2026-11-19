import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Panel } from './Panel'
import { Button } from './Button'
import {
  loadSrdSpellCatalog,
  loadSrdSpellDescription,
  type SrdSpellSummary,
} from '../data/srd'
import type { BossResourceKind, ResourceAdjustment } from '../combat/engine'
import type {
  AbilityScores,
  CombatantState,
  Creature,
  CreatureAction,
  CreatureSpellDescription,
  LimitedUseResourceState,
  SrdSpellReference,
} from '../domain/types'

type CreatureDetailsPanelProps = {
  creature?: Creature
  combatant?: CombatantState
  canAdjustBossResources?: boolean
  onAdjustBossResource?: (
    combatantId: string,
    resource: BossResourceKind,
    direction: ResourceAdjustment,
    spellSlotLevel?: number,
  ) => void
}

const abilityNames: { key: keyof AbilityScores; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
]

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

function formatEntries(entries: Record<string, number> | undefined): string {
  return Object.entries(entries ?? {})
    .map(([name, value]) => `${name} ${formatModifier(value)}`)
    .join(', ')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function DetailSection({
  title,
  entries,
  srdSpells = [],
  spellDescriptions = [],
  srdSpellCatalog = [],
}: {
  title: string
  entries?: CreatureAction[]
  srdSpells?: SrdSpellReference[]
  spellDescriptions?: CreatureSpellDescription[]
  srdSpellCatalog?: SrdSpellSummary[]
}) {
  const [selectedSpell, setSelectedSpell] = useState<SpellPopupContent | null>(null)
  if (!entries?.length) return null

  const spellsByName = new Map<string, SpellPopupContent>()
  for (const spell of srdSpells) {
    spellsByName.set(spell.name.toLowerCase(), {
      name: spell.name,
      srdIndex: spell.index,
    })
  }
  for (const spell of spellDescriptions) {
    spellsByName.set(spell.name.toLowerCase(), spell)
  }
  for (const spell of srdSpellCatalog) {
    const existingSpell = spellsByName.get(spell.name.toLowerCase())
    if (existingSpell?.description) continue
    spellsByName.set(spell.name.toLowerCase(), {
      name: spell.name,
      srdIndex: spell.index,
    })
  }
  const spellPattern =
    spellsByName.size > 0
      ? new RegExp(
          `(^|[^A-Za-z0-9])(${[...spellsByName.keys()]
            .sort((first, second) => second.length - first.length)
            .map(escapeRegExp)
            .join('|')})(?=$|[^A-Za-z0-9])`,
          'gi',
        )
      : undefined

  function renderDescription(description: string) {
    if (!spellPattern) return description

    const parts: ReactNode[] = []
    let lastIndex = 0
    for (const match of description.matchAll(spellPattern)) {
      const start = match.index ?? 0
      const nameStart = start + match[1].length
      const spellName = match[2]
      const spell = spellsByName.get(spellName.toLowerCase())
      if (!spell) continue

      parts.push(description.slice(lastIndex, nameStart))
      parts.push(
        <button
          key={`${nameStart}-${spellName}`}
          type="button"
          className="text-accent underline decoration-accent/50 underline-offset-2 hover:text-ink"
          onClick={() => setSelectedSpell(spell)}
        >
          {spellName}
        </button>,
      )
      lastIndex = start + match[0].length
    }
    parts.push(description.slice(lastIndex))
    return parts
  }

  return (
    <>
      <section>
        <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-accent">
          {title}
        </h3>
        <ul className="space-y-3">
          {entries.map((entry, index) => (
            <li key={`${entry.name}-${index}`} className="text-sm">
              <strong className="text-ink">{entry.name}.</strong>{' '}
              <span className="whitespace-pre-line text-muted">
                {renderDescription(entry.description)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {selectedSpell && (
        <SpellDescriptionPopup
          spell={selectedSpell}
          onClose={() => setSelectedSpell(null)}
        />
      )}
    </>
  )
}

function ResourceCounter({
  label,
  resource,
  kind,
  spellSlotLevel,
  canAdjust,
  onAdjust,
}: {
  label: string
  resource: LimitedUseResourceState
  kind: BossResourceKind
  spellSlotLevel?: number
  canAdjust: boolean
  onAdjust: (
    kind: BossResourceKind,
    direction: ResourceAdjustment,
    spellSlotLevel?: number,
  ) => void
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border border-line p-2">
      <span className="text-sm text-ink">
        {label}: {resource.max - resource.used} / {resource.max} available
      </span>
      <div className="flex gap-2">
        <Button
          aria-label={`Spend one ${label}`}
          disabled={!canAdjust || resource.used >= resource.max}
          className="px-2 py-1"
          onClick={() => onAdjust(kind, 'spend', spellSlotLevel)}
        >
          Spend
        </Button>
        <Button
          aria-label={`Restore one ${label}`}
          disabled={!canAdjust || resource.used <= 0}
          className="px-2 py-1"
          onClick={() => onAdjust(kind, 'restore', spellSlotLevel)}
        >
          Restore
        </Button>
      </div>
    </li>
  )
}

function SpellSlotTracker({
  slots,
  canAdjust,
  onAdjust,
}: {
  slots: Record<number, LimitedUseResourceState>
  canAdjust: boolean
  onAdjust: (level: number, direction: ResourceAdjustment) => void
}) {
  const levels = Object.entries(slots).sort(
    ([first], [second]) => Number(first) - Number(second),
  )

  return (
    <div
      className="grid grid-flow-col auto-cols-[minmax(2.5rem,1fr)] gap-1 overflow-x-auto"
      aria-label="Spell slots by level"
    >
      {levels.map(([level, resource]) => {
        const available = resource.max - resource.used
        return (
          <div
            key={level}
            className="flex flex-col items-center gap-2 border border-line px-1 py-2"
          >
            <span className="font-mono text-[9px] text-muted">LVL {level}</span>
            <div className="flex flex-col gap-1">
              {Array.from({ length: resource.max }, (_, index) => {
                const isSpent = index < resource.used
                const action = isSpent ? 'restore' : 'spend'
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`${isSpent ? 'Restore' : 'Spend'} level ${level} spell slot ${index + 1} of ${resource.max}`}
                    aria-pressed={isSpent}
                    disabled={!canAdjust}
                    className="grid size-8 place-items-center rounded-full disabled:cursor-not-allowed"
                    onClick={() => onAdjust(Number(level), action)}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-3 rounded-full ${
                        isSpent
                          ? 'bg-accent'
                          : 'border border-muted bg-transparent'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
            <span className="font-mono text-[9px] text-muted">
              {available}/{resource.max}
            </span>
          </div>
        )
      })}
    </div>
  )
}

type SpellPopupContent = {
  name: string
  description?: string
  srdIndex?: string
}

function SpellDescriptionPopup({
  spell,
  onClose,
}: {
  spell: SpellPopupContent
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [description, setDescription] = useState(spell.description ?? '')
  const [isLoading, setIsLoading] = useState(Boolean(spell.srdIndex && !spell.description))
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const error =
    spell.description || spell.srdIndex
      ? loadError
      : 'A spell description is not available.'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    if (spell.description) return
    if (!spell.srdIndex) return

    let isCancelled = false
    loadSrdSpellDescription(spell.srdIndex)
      .then((result) => {
        if (!isCancelled) setDescription(result.description)
      })
      .catch((loadError: unknown) => {
        if (!isCancelled) {
          setLoadError(
            loadError instanceof Error
              ? loadError.message
              : 'The spell description could not be loaded.',
          )
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [spell.description, spell.srdIndex, retryCount])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="spell-description-title"
      className="m-auto max-h-[85dvh] w-[min(90vw,40rem)] max-w-none overflow-y-auto border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-black/70"
      onCancel={onClose}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line p-4">
        <h3
          id="spell-description-title"
          className="font-display text-xl text-ink"
        >
          {spell.name}
        </h3>
        <Button onClick={onClose}>Close</Button>
      </div>
      <div className="p-4">
        {isLoading && <p role="status" className="text-sm text-muted">Loading spell description…</p>}
        {error && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-danger">{error}</p>
            {spell.srdIndex && (
              <Button
                onClick={() => {
                  setLoadError('')
                  setIsLoading(true)
                  setRetryCount((count) => count + 1)
                }}
              >
                Retry
              </Button>
            )}
          </div>
        )}
        {description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
    </dialog>
  )
}

export function CreatureDetailsPanel({
  creature,
  combatant,
  canAdjustBossResources = false,
  onAdjustBossResource,
}: CreatureDetailsPanelProps) {
  const [srdSpellCatalog, setSrdSpellCatalog] = useState<SrdSpellSummary[]>([])
  useEffect(() => {
    let isCancelled = false
    loadSrdSpellCatalog().then((spells) => {
      if (!isCancelled) setSrdSpellCatalog(spells)
    })
    return () => {
      isCancelled = true
    }
  }, [])

  if (!creature) {
    return (
      <Panel variant="default" className="h-full min-h-0 overflow-y-auto">
        <p className="font-mono text-[10px] tracking-[1px] text-muted">
          CREATURE DETAILS
        </p>
        <p className="mt-4 text-sm text-muted" role={combatant ? 'alert' : undefined}>
          {combatant
            ? `Saved creature details are unavailable for ${combatant.name}.`
            : 'Select a creature in the initiative order to view its stat block.'}
        </p>
      </Panel>
    )
  }

  const resources = creature.bossResources
  const spellSlots = Object.entries(resources?.spellSlots ?? {}).sort(
    ([first], [second]) => Number(first) - Number(second),
  )
  const encounterResources = combatant?.bossResourcesState
  const adjustResource = (
    resource: BossResourceKind,
    direction: ResourceAdjustment,
    spellSlotLevel?: number,
  ) => {
    if (!combatant || !onAdjustBossResource) return
    onAdjustBossResource(combatant.id, resource, direction, spellSlotLevel)
  }
  const abilityScores = creature.abilities
  const abilities = abilityScores
    ? abilityNames.map(({ key, label }) => ({
        label,
        score: abilityScores[key],
        modifier:
          key === 'dex'
            ? creature.dexterityModifier
            : Math.floor((abilityScores[key] - 10) / 2),
      }))
    : []
  const traits = creature.traits ?? []
  const hasSpellcastingTrait = traits.some(
    (trait) => trait.name.toLowerCase() === 'spellcasting',
  )
  const spellcastingDescription = creature.spellcasting?.trim()
  const displayedTraits =
    spellcastingDescription && !hasSpellcastingTrait
      ? [
          ...traits,
          {
            name: 'Spellcasting',
            description: spellcastingDescription.replace(/^Spellcasting:\s*/i, ''),
          },
        ]
      : traits

  return (
    <Panel
      variant="default"
      className="h-full min-h-0 overflow-y-auto"
    >
      <p className="font-mono text-[10px] tracking-[1px] text-accent">
        SELECTED CREATURE
      </p>
      <h2 className="mt-2 font-display text-2xl leading-tight text-ink">
        {creature.name}
      </h2>
      <p className="mt-1 text-sm capitalize text-muted">
        {[creature.size, creature.type, creature.alignment].filter(Boolean).join(' ')}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <div className="border border-line p-2">
          <dt className="font-mono text-[9px] tracking-[.7px] text-muted">ARMOR CLASS</dt>
          <dd className="mt-1 font-medium text-ink">{creature.ac}</dd>
        </div>
        <div className="border border-line p-2">
          <dt className="font-mono text-[9px] tracking-[.7px] text-muted">HIT POINTS</dt>
          <dd className="mt-1 font-medium text-ink">
            {combatant?.currentHp ?? creature.hpAverage}
            {combatant?.maxHp !== undefined && (
              <span className="text-muted"> / {combatant.maxHp}</span>
            )}
          </dd>
        </div>
        <div className="border border-line p-2">
          <dt className="font-mono text-[9px] tracking-[.7px] text-muted">SPEED</dt>
          <dd className="mt-1 text-ink">{creature.speed ?? '—'}</dd>
        </div>
        <div className="border border-line p-2">
          <dt className="font-mono text-[9px] tracking-[.7px] text-muted">CHALLENGE</dt>
          <dd className="mt-1 text-ink">
            {creature.challengeRating ?? '—'}
            {creature.xp !== undefined && (
              <span className="text-muted"> · {creature.xp} XP</span>
            )}
          </dd>
        </div>
      </dl>

      {creature.hpFormula && (
        <p className="mt-2 text-xs text-muted">Hit dice: {creature.hpFormula}</p>
      )}

      {abilities.length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-1">
          {abilities.map(({ label, score, modifier }) => (
            <div key={label} className="bg-raised p-2 text-center">
              <dt className="font-mono text-[9px] text-muted">{label}</dt>
              <dd className="text-sm font-medium text-ink">
                <span className="ml-1 text-xs text-muted">
                  {score} ({formatModifier(modifier)})
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
        {[
          ['Saving throws', formatEntries(creature.savingThrows)],
          ['Skills', formatEntries(creature.skills)],
          ['Senses', creature.senses],
          ['Languages', creature.languages],
          ['Source', creature.source.toUpperCase()],
          ['Tags', creature.tags?.join(', ')],
        ]
          .filter((entry): entry is [string, string] => Boolean(entry[1]))
          .map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
              <dt className="text-muted">{label}</dt>
              <dd className="break-words text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      {encounterResources && (
        <section className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-accent">
            ENCOUNTER RESOURCES
          </h3>
          <div className="space-y-3">
            {Object.keys(encounterResources.spellSlots ?? {}).length > 0 && (
              <section>
                <h4 className="mb-1 text-xs text-muted">Spell slots</h4>
                <SpellSlotTracker
                  slots={encounterResources.spellSlots ?? {}}
                  canAdjust={canAdjustBossResources}
                  onAdjust={(level, direction) =>
                    adjustResource('spellSlots', direction, level)
                  }
                />
              </section>
            )}
            {encounterResources.legendaryActions && (
              <ul>
                <ResourceCounter
                  label="Legendary action"
                  resource={encounterResources.legendaryActions}
                  kind="legendaryActions"
                  canAdjust={canAdjustBossResources}
                  onAdjust={adjustResource}
                />
              </ul>
            )}
            {encounterResources.legendaryResistances && (
              <ul>
                <ResourceCounter
                  label="Legendary resistance"
                  resource={encounterResources.legendaryResistances}
                  kind="legendaryResistances"
                  canAdjust={canAdjustBossResources}
                  onAdjust={adjustResource}
                />
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="mt-5 space-y-5 border-t border-line pt-4">
        <DetailSection
          title="TRAITS"
          entries={displayedTraits}
          srdSpells={creature.srdSpells}
          spellDescriptions={creature.spellDescriptions}
          srdSpellCatalog={srdSpellCatalog}
        />
        <DetailSection title="ACTIONS" entries={creature.actions} />
        <DetailSection title="REACTIONS" entries={creature.reactions} />
        <DetailSection
          title="LEGENDARY ACTIONS"
          entries={creature.legendaryActions}
        />
        <DetailSection title="LAIR ACTIONS" entries={creature.lairActions} />
      </div>

      {(spellSlots.length > 0 ||
        resources?.legendaryActions !== undefined ||
        resources?.legendaryResistances !== undefined ||
        resources?.hasLairActions) && (
        <section className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-accent">
            RESOURCE LIMITS
          </h3>
          <ul className="space-y-1 text-xs text-muted">
            {spellSlots.map(([level, count]) => (
              <li key={level}>Level {level} spell slots: {count}</li>
            ))}
            {resources?.legendaryActions !== undefined && (
              <li>Legendary actions per turn: {resources.legendaryActions}</li>
            )}
            {resources?.legendaryResistances !== undefined && (
              <li>Legendary resistances: {resources.legendaryResistances}</li>
            )}
            {resources?.hasLairActions && <li>Has lair actions</li>}
          </ul>
        </section>
      )}
    </Panel>
  )
}
