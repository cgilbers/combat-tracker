import type { Creature, CreatureAction } from './types'

const abilities = [
  ['str', 'Strength'],
  ['dex', 'Dexterity'],
  ['con', 'Constitution'],
  ['int', 'Intelligence'],
  ['wis', 'Wisdom'],
  ['cha', 'Charisma'],
] as const

const isWholeNumber = (value: number) =>
  Number.isFinite(value) && Number.isInteger(value)

function validateActions(
  actions: CreatureAction[] | undefined,
  label: string,
): string[] {
  if (!actions) return []
  return actions.some((action) => !action.name.trim() || !action.description.trim())
    ? [`${label} must each have a name and description.`]
    : []
}

export function validateCreature(creature: Creature): string[] {
  const errors: string[] = []

  if (!creature.name.trim()) errors.push('Name is required.')
  if (!creature.id.trim()) errors.push('Creature ID is required.')
  if (creature.source !== 'custom' && creature.source !== 'srd') {
    errors.push('Creature source must be custom or SRD.')
  }
  if (!isWholeNumber(creature.ac) || creature.ac < 1) {
    errors.push('AC must be a positive whole number.')
  }
  if (!isWholeNumber(creature.hpAverage) || creature.hpAverage < 1) {
    errors.push('Average HP must be a positive whole number.')
  }
  if (!Number.isFinite(creature.dexterityModifier)) {
    errors.push('Dexterity modifier must be a number.')
  }

  if (creature.abilities) {
    for (const [key, label] of abilities) {
      const score = creature.abilities[key]
      if (!isWholeNumber(score) || score < 1) {
        errors.push(`${label} score must be a positive whole number.`)
      }
    }
  }

  for (const [label, values] of [
    ['Saving throws', creature.savingThrows],
    ['Skills', creature.skills],
  ] as const) {
    if (
      values &&
      Object.entries(values).some(([name, value]) => !name.trim() || !Number.isFinite(value))
    ) {
      errors.push(`${label} must have names and numeric modifiers.`)
    }
  }

  if (
    creature.challengeRating !== undefined &&
    (!Number.isFinite(creature.challengeRating) || creature.challengeRating < 0)
  ) {
    errors.push('Challenge rating must be a non-negative number.')
  }
  if (creature.xp !== undefined && (!isWholeNumber(creature.xp) || creature.xp < 0)) {
    errors.push('XP must be a non-negative whole number.')
  }

  errors.push(
    ...validateActions(creature.traits, 'Traits'),
    ...validateActions(creature.actions, 'Actions'),
    ...validateActions(creature.reactions, 'Reactions'),
    ...validateActions(creature.legendaryActions, 'Legendary actions'),
    ...validateActions(creature.lairActions, 'Lair actions'),
  )

  const resources = creature.bossResources
  if (resources) {
    if (
      resources.spellSlots &&
      Object.entries(resources.spellSlots).some(
        ([level, max]) =>
          !/^[1-9]$/.test(level) || !isWholeNumber(max) || max < 0,
      )
    ) {
      errors.push('Spell slot limits must be non-negative whole numbers for levels 1–9.')
    }
    if (
      resources.legendaryActions !== undefined &&
      (!isWholeNumber(resources.legendaryActions) || resources.legendaryActions < 0)
    ) {
      errors.push('Legendary actions must be a non-negative whole number.')
    }
    if (
      resources.legendaryResistances !== undefined &&
      (!isWholeNumber(resources.legendaryResistances) ||
        resources.legendaryResistances < 0)
    ) {
      errors.push('Legendary resistances must be a non-negative whole number.')
    }
  }

  if (creature.tags?.some((tag) => !tag.trim())) {
    errors.push('Tags cannot be empty.')
  }

  return errors
}

export function parseNamedEntries(text: string): CreatureAction[] | undefined {
  const entries = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex < 1) {
        return { name: '', description: '' }
      }
      return {
        name: line.slice(0, separatorIndex).trim(),
        description: line.slice(separatorIndex + 1).trim(),
      }
    })

  return entries.length ? entries : undefined
}

export function formatNamedEntries(entries: CreatureAction[] | undefined): string {
  return entries?.map(({ name, description }) => `${name}: ${description}`).join('\n') ?? ''
}

export function parseNumericEntries(text: string): Record<string, number> | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return undefined

  const entries = lines.map((line) => {
    const separatorIndex = line.indexOf(':')
    return {
      name: separatorIndex < 1 ? '' : line.slice(0, separatorIndex).trim(),
      value: separatorIndex < 1 ? Number.NaN : Number(line.slice(separatorIndex + 1)),
    }
  })
  return Object.fromEntries(entries.map(({ name, value }) => [name, value]))
}

export function formatNumericEntries(entries: Record<string, number> | undefined): string {
  return (
    Object.entries(entries ?? {})
      .map(([name, value]) => `${name}: ${value}`)
      .join('\n')
  )
}
