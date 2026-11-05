import { Panel } from './Panel'
import type {
  AbilityScores,
  CombatantState,
  Creature,
  CreatureAction,
} from '../domain/types'

type CreatureDetailsPanelProps = {
  creature?: Creature
  combatant?: CombatantState
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

function DetailSection({
  title,
  entries,
}: {
  title: string
  entries?: CreatureAction[]
}) {
  if (!entries?.length) return null

  return (
    <section>
      <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-lime">
        {title}
      </h3>
      <ul className="space-y-3">
        {entries.map((entry, index) => (
          <li key={`${entry.name}-${index}`} className="text-sm">
            <strong className="text-ink">{entry.name}.</strong>{' '}
            <span className="whitespace-pre-line text-muted">{entry.description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CreatureDetailsPanel({
  creature,
  combatant,
}: CreatureDetailsPanelProps) {
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

  return (
    <Panel
      variant="default"
      className="h-full min-h-0 overflow-y-auto"
    >
      <p className="font-mono text-[10px] tracking-[1px] text-lime">
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
            <div key={label} className="bg-night p-2 text-center">
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

      {creature.spellcasting && (
        <section className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-lime">
            SPELLCASTING & SPELLS
          </h3>
          <p className="whitespace-pre-line text-sm text-muted">
            {creature.spellcasting}
          </p>
        </section>
      )}

      <div className="mt-5 space-y-5 border-t border-line pt-4">
        <DetailSection title="TRAITS" entries={creature.traits} />
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
          <h3 className="mb-2 font-mono text-[10px] tracking-[1px] text-lime">
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
