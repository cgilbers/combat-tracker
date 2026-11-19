import type {
  Creature,
  CreatureAction,
  SrdSpellReference,
} from '../domain/types'

export const SRD_CACHE_KEY = 'combat-tracker:srd-creatures'
export const SRD_CATALOG_CACHE_KEY = 'combat-tracker:srd-catalog'
export const SRD_SPELL_CATALOG_CACHE_KEY = 'combat-tracker:srd-spell-catalog'
export const SRD_ATTRIBUTION =
  'This work includes material taken from the System Reference Document 5.1 (SRD 5.1) by Wizards of the Coast LLC. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License. Creature data is retrieved from the D&D 5e API.'

export type SrdMonsterSummary = {
  index: string
  name: string
}

export type SrdSpellSummary = {
  index: string
  name: string
  level: number
}

export type SrdProvider = {
  listMonsters(): Promise<SrdMonsterSummary[]>
  fetchMonster(index: string): Promise<unknown>
}

export type SrdSpellCatalogProvider = {
  listSpells(): Promise<SrdSpellSummary[]>
}

export type SrdSpellDescription = {
  name: string
  description: string
}

export type SrdCatalogResult =
  | {
      status: 'success'
      creatures: SrdMonsterSummary[]
    }
  | {
      status: 'cache'
      creatures: SrdMonsterSummary[]
    }
  | {
      status: 'network-error'
      creatures: []
      error: Error
    }

export type SrdSingleImportResult =
  | {
      status: 'success' | 'cache'
      creature: Creature
    }
  | {
      status: 'network-error'
      error: Error
    }

function getStorage(): Storage | undefined {
  const globalObject = globalThis as typeof globalThis & {
    localStorage?: Storage
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return globalObject.localStorage
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function getProperty(record: Record<string, unknown>, key: string): unknown {
  return record[key]
}

function toActionList(items: unknown): CreatureAction[] | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined

  return items
    .map((item) => {
      const entry = item as Record<string, unknown>
      const name = typeof entry.name === 'string' ? entry.name.trim() : ''
      const description =
        typeof entry.desc === 'string'
          ? entry.desc.trim()
          : typeof entry.description === 'string'
            ? entry.description.trim()
            : ''

      if (!name || !description) return null
      return { name, description }
    })
    .filter((item): item is CreatureAction => item !== null)
}

function readAbility(record: Record<string, unknown>, key: string): number {
  const value = getProperty(record, key)
  const score = asNumber(value)
  if (score === undefined) {
    throw new Error(`SRD creature response is missing the ${key} ability score.`)
  }
  return score
}

function readAbilityScores(record: Record<string, unknown>): Record<string, number> {
  const directScores = typeof record.ability_scores === 'object' && record.ability_scores
    ? (record.ability_scores as Array<Record<string, unknown>>)
    : []

  const scores = directScores.length
    ? Object.fromEntries(
        directScores.map((score) => {
          const name = typeof score.name === 'string' ? score.name.toLowerCase() : ''
          const value = asNumber(score.value)
          return [name, value ?? 10]
        }),
      )
    : {
        str: readAbility(record, 'strength'),
        dex: readAbility(record, 'dexterity'),
        con: readAbility(record, 'constitution'),
        int: readAbility(record, 'intelligence'),
        wis: readAbility(record, 'wisdom'),
        cha: readAbility(record, 'charisma'),
      }

  return {
    str: scores.str ?? 10,
    dex: scores.dex ?? 10,
    con: scores.con ?? 10,
    int: scores.int ?? 10,
    wis: scores.wis ?? 10,
    cha: scores.cha ?? 10,
  }
}

function parseNameValueMap(value: unknown): Record<string, number> | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined

  const entries: Record<string, number> = {}
  for (const item of value) {
    const entry = item as Record<string, unknown>
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    const numericValue = asNumber(entry.value)
    if (name && numericValue !== undefined) {
      entries[name] = numericValue
    }
  }

  return Object.keys(entries).length ? entries : undefined
}

function readSpellSlotLimits(
  spellcasting: unknown,
  specialAbilities: unknown,
): Record<number, number> | undefined {
  const entries = [
    ...(Array.isArray(spellcasting) ? spellcasting : []),
    ...(Array.isArray(specialAbilities) ? specialAbilities : []),
  ]

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const spellcastingRecord = (entry as Record<string, unknown>).spellcasting
    if (!spellcastingRecord || typeof spellcastingRecord !== 'object') continue
    const slots = (spellcastingRecord as Record<string, unknown>).slots
    if (!slots || typeof slots !== 'object') continue

    const limits = Object.fromEntries(
      Object.entries(slots as Record<string, unknown>)
        .map(([level, count]) => [Number(level), asNumber(count)] as const)
        .filter(
          (entry): entry is readonly [number, number] =>
            Number.isInteger(entry[0]) &&
            entry[0] >= 1 &&
            entry[0] <= 9 &&
            entry[1] !== undefined &&
            Number.isInteger(entry[1]) &&
            entry[1] >= 0,
        ),
    )
    if (Object.keys(limits).length > 0) return limits
  }

  return undefined
}

function readSrdSpellReferences(
  spellcasting: unknown,
  specialAbilities: unknown,
): SrdSpellReference[] | undefined {
  const entries = [
    ...(Array.isArray(spellcasting) ? spellcasting : []),
    ...(Array.isArray(specialAbilities) ? specialAbilities : []),
  ]
  const spells = new Map<string, SrdSpellReference>()

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const spellcastingRecord = (entry as Record<string, unknown>).spellcasting
    if (!spellcastingRecord || typeof spellcastingRecord !== 'object') continue
    const spellList = (spellcastingRecord as Record<string, unknown>).spells
    if (!Array.isArray(spellList)) continue

    for (const value of spellList) {
      if (!value || typeof value !== 'object') continue
      const spell = value as Record<string, unknown>
      const name = typeof spell.name === 'string' ? spell.name.trim() : ''
      const level = asNumber(spell.level)
      const url = typeof spell.url === 'string' ? spell.url : ''
      const index =
        typeof spell.index === 'string'
          ? spell.index
          : url.match(/\/spells\/([a-z0-9-]+)\/?$/i)?.[1]
      if (
        !name ||
        !index ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(index) ||
        level === undefined ||
        !Number.isInteger(level) ||
        level < 0 ||
        level > 9
      ) {
        continue
      }
      spells.set(index, { index, name, level })
    }
  }

  return spells.size > 0 ? [...spells.values()] : undefined
}

function readLegendaryResistanceLimit(specialAbilities: unknown): number | undefined {
  if (!Array.isArray(specialAbilities)) return undefined

  const resistance = specialAbilities.find((ability) => {
    if (!ability || typeof ability !== 'object') return false
    const name = (ability as Record<string, unknown>).name
    return typeof name === 'string' && /^legendary resistance\b/i.test(name)
  })
  if (!resistance || typeof resistance !== 'object') return undefined

  const record = resistance as Record<string, unknown>
  const usage =
    record.usage && typeof record.usage === 'object'
      ? (record.usage as Record<string, unknown>)
      : undefined
  const times = asNumber(usage?.times)
  if (times !== undefined && Number.isInteger(times) && times >= 0) return times

  const name = typeof record.name === 'string' ? record.name : ''
  const description =
    typeof record.desc === 'string'
      ? record.desc
      : typeof record.description === 'string'
        ? record.description
        : ''
  const usageText = `${name} ${description}`
  const match = usageText.match(/\b(\d+)\s*(?:\/\s*day|times?\s+per\s+day)\b/i)
  return match ? Number(match[1]) : undefined
}

export function normalizeSrdCreature(raw: unknown): Creature {
  if (!raw || typeof raw !== 'object') {
    throw new Error('SRD creature response is not a valid stat block.')
  }
  const record = raw as Record<string, unknown>
  if (typeof record.name !== 'string' || !record.name.trim()) {
    throw new Error('SRD creature response is missing its name.')
  }
  if (typeof record.index !== 'string' || !record.index.trim()) {
    throw new Error('SRD creature response is missing its identifier.')
  }
  const name = record.name.trim()
  const index = record.index.trim()
  const armorClass = Array.isArray(record.armor_class)
    ? (record.armor_class as Array<Record<string, unknown>>).find((entry) => typeof entry.value === 'number' || typeof entry.value === 'string')
    : undefined
  const ac = asNumber(armorClass?.value) ?? asNumber(record.ac)
  const hpAverage = asNumber(record.hit_points)
  if (ac === undefined || !Number.isInteger(ac) || ac < 1) {
    throw new Error(`SRD creature response for ${name} has invalid armor class.`)
  }
  if (hpAverage === undefined || !Number.isInteger(hpAverage) || hpAverage < 1) {
    throw new Error(`SRD creature response for ${name} has invalid hit points.`)
  }
  const hpFormula = typeof record.hit_dice === 'string' ? record.hit_dice : undefined
  const abilityScores = readAbilityScores(record)
  const speedValue =
    typeof record.speed === 'string'
      ? record.speed
      : typeof record.speed === 'object' && record.speed !== null
        ? Object.entries(record.speed as Record<string, unknown>)
            .map(([key, value]) => `${key} ${value}`)
            .join(', ')
        : undefined
  const sensesValue =
    typeof record.senses === 'string'
      ? record.senses
      : typeof record.senses === 'object' && record.senses !== null
        ? Object.entries(record.senses as Record<string, unknown>)
            .map(([key, value]) => `${key} ${value}`)
            .join(', ')
        : undefined
  const challenge = typeof record.challenge === 'object' && record.challenge !== null
    ? (record.challenge as Record<string, unknown>)
    : undefined
  const xp = asNumber(challenge?.xp) ?? asNumber(record.xp)
  const challengeRating =
    asNumber(challenge?.cr) ??
    asNumber(challenge?.rating) ??
    asNumber(record.challenge_rating)
  const traits = toActionList(record.special_abilities)
  const actions = toActionList(record.actions)
  const reactions = toActionList(record.reactions)
  const legendaryActions = toActionList(record.legendary_actions)
  const lairActions = toActionList(record.lair_actions)
  const spellSlotLimits = readSpellSlotLimits(
    record.spellcasting,
    record.special_abilities,
  )
  const srdSpells = readSrdSpellReferences(
    record.spellcasting,
    record.special_abilities,
  )
  const legendaryResistanceLimit = readLegendaryResistanceLimit(
    record.special_abilities,
  )
  const spellcastingValue = Array.isArray(record.spellcasting)
    ? (record.spellcasting as Array<Record<string, unknown>>)
        .map((entry) => `${entry.name ?? 'Spellcasting'}: ${entry.desc ?? ''}`.trim())
        .filter(Boolean)
        .join('\n')
    : undefined

  const bossResources =
    legendaryActions ||
    lairActions ||
    spellcastingValue ||
    spellSlotLimits ||
    legendaryResistanceLimit !== undefined
      ? {
          ...(spellSlotLimits ? { spellSlots: spellSlotLimits } : {}),
          ...(legendaryActions ? { legendaryActions: legendaryActions.length } : {}),
          ...(legendaryResistanceLimit !== undefined
            ? { legendaryResistances: legendaryResistanceLimit }
            : {}),
          ...(lairActions ? { hasLairActions: true } : {}),
        }
      : undefined

  return {
    id: `srd:${index}`,
    source: 'srd',
    name,
    type: typeof record.type === 'string' ? record.type : undefined,
    size: typeof record.size === 'string' ? record.size : undefined,
    alignment: typeof record.alignment === 'string' ? record.alignment : undefined,
    ac,
    hpAverage,
    hpFormula,
    speed: speedValue,
    abilities: {
      str: abilityScores.str,
      dex: abilityScores.dex,
      con: abilityScores.con,
      int: abilityScores.int,
      wis: abilityScores.wis,
      cha: abilityScores.cha,
    },
    dexterityModifier: Math.floor((abilityScores.dex - 10) / 2),
    savingThrows: parseNameValueMap(record.saving_throws),
    skills: parseNameValueMap(record.skills),
    senses: sensesValue,
    languages: typeof record.languages === 'string' ? record.languages : undefined,
    challengeRating,
    xp,
    traits,
    actions,
    reactions,
    legendaryActions,
    lairActions,
    spellcasting: spellcastingValue,
    srdSpells,
    bossResources,
    tags: typeof record.tags === 'string' ? record.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
  }
}

export function readCachedSrdCreatures(): Creature[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(SRD_CACHE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as { creatures?: unknown }
    if (!Array.isArray(parsed.creatures)) return []

    return parsed.creatures.filter((creature): creature is Creature => {
      if (!creature || typeof creature !== 'object') return false
      const candidate = creature as Record<string, unknown>
      return (
        typeof candidate.id === 'string' &&
        candidate.id.startsWith('srd:') &&
        candidate.source === 'srd' &&
        typeof candidate.name === 'string'
      )
    }) as Creature[]
  } catch {
    return []
  }
}

export function saveCachedSrdCreatures(creatures: Creature[]): void {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(
    SRD_CACHE_KEY,
    JSON.stringify({
      version: 1,
      cachedAt: new Date().toISOString(),
      creatures,
    }),
  )
}

function readCachedSrdCatalog(): SrdMonsterSummary[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(SRD_CATALOG_CACHE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as { creatures?: unknown }
    if (!Array.isArray(parsed.creatures)) return []
    return parsed.creatures.filter(
      (creature): creature is SrdMonsterSummary =>
        Boolean(creature) &&
        typeof creature === 'object' &&
        typeof (creature as SrdMonsterSummary).index === 'string' &&
        typeof (creature as SrdMonsterSummary).name === 'string',
    )
  } catch {
    return []
  }
}

function readCachedSrdSpellCatalog(): SrdSpellSummary[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(SRD_SPELL_CATALOG_CACHE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as { spells?: unknown }
    if (!Array.isArray(parsed.spells)) return []
    return parsed.spells.filter(
      (spell): spell is SrdSpellSummary =>
        Boolean(spell) &&
        typeof spell === 'object' &&
        typeof (spell as SrdSpellSummary).index === 'string' &&
        typeof (spell as SrdSpellSummary).name === 'string' &&
        typeof (spell as SrdSpellSummary).level === 'number' &&
        Number.isInteger((spell as SrdSpellSummary).level) &&
        (spell as SrdSpellSummary).level >= 0 &&
        (spell as SrdSpellSummary).level <= 9,
    )
  } catch {
    return []
  }
}

function saveCachedSrdSpellCatalog(spells: SrdSpellSummary[]): void {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(
    SRD_SPELL_CATALOG_CACHE_KEY,
    JSON.stringify({ version: 1, spells }),
  )
}

function saveCachedSrdCatalog(creatures: SrdMonsterSummary[]): void {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(
    SRD_CATALOG_CACHE_KEY,
    JSON.stringify({ version: 1, creatures }),
  )
}

export class DnD5eApiProvider implements SrdProvider {
  readonly baseUrl: string

  constructor(baseUrl = 'https://www.dnd5eapi.co/api/2014') {
    this.baseUrl = baseUrl
  }

  async listMonsters(): Promise<SrdMonsterSummary[]> {
    const payload = await this.fetchJson(`${this.baseUrl}/monsters`)
    const results = typeof payload === 'object' && payload !== null && 'results' in payload
      ? (payload as { results?: Array<{ index?: string; name?: string }> }).results ?? []
      : []

    return results
      .filter(
        (entry): entry is { index: string; name: string } =>
          typeof entry.index === 'string' &&
          entry.index.trim() !== '' &&
          typeof entry.name === 'string' &&
          entry.name.trim() !== '',
      )
      .map(({ index, name }) => ({ index, name }))
  }

  async listSpells(): Promise<SrdSpellSummary[]> {
    const payload = await this.fetchJson(`${this.baseUrl}/spells`)
    const results = typeof payload === 'object' && payload !== null && 'results' in payload
      ? (payload as { results?: Array<{ index?: string; name?: string; level?: number }> }).results ?? []
      : []

    return results
      .filter(
        (entry): entry is { index: string; name: string; level: number } =>
          typeof entry.index === 'string' &&
          entry.index.trim() !== '' &&
          typeof entry.name === 'string' &&
          entry.name.trim() !== '' &&
          typeof entry.level === 'number' &&
          Number.isInteger(entry.level) &&
          entry.level >= 0 &&
          entry.level <= 9,
      )
      .map(({ index, name, level }) => ({ index, name, level }))
  }

  async fetchMonster(index: string): Promise<unknown> {
    return this.fetchJson(`${this.baseUrl}/monsters/${index}`)
  }

  async fetchSpell(index: string): Promise<unknown> {
    return this.fetchJson(`${this.baseUrl}/spells/${index}`)
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`SRD request failed for ${url}: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
}

export async function loadSrdSpellDescription(
  index: string,
  fetchSpell: (index: string) => Promise<unknown> = (spellIndex) =>
    new DnD5eApiProvider().fetchSpell(spellIndex),
): Promise<SrdSpellDescription> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(index)) {
    throw new Error('The SRD spell identifier is invalid.')
  }

  const payload = await fetchSpell(index)
  if (!payload || typeof payload !== 'object') {
    throw new Error(`The SRD description for ${index} is not available.`)
  }
  const record = payload as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const descriptionValue = record.desc
  const description = Array.isArray(descriptionValue)
    ? descriptionValue.filter((line): line is string => typeof line === 'string').join('\n\n')
    : typeof descriptionValue === 'string'
      ? descriptionValue.trim()
      : ''
  const higherLevel = Array.isArray(record.higher_level)
    ? record.higher_level
        .filter((line): line is string => typeof line === 'string')
        .join('\n\n')
    : typeof record.higher_level === 'string'
      ? record.higher_level.trim()
      : ''

  if (!name || !description) {
    throw new Error(`The SRD description for ${index} is not available.`)
  }

  return {
    name,
    description: higherLevel
      ? `${description}\n\nAt Higher Levels. ${higherLevel}`
      : description,
  }
}

export async function loadSrdCatalog(
  provider: SrdProvider = new DnD5eApiProvider(),
): Promise<SrdCatalogResult> {
  try {
    const creatures = await provider.listMonsters()
    saveCachedSrdCatalog(creatures)
    return { status: 'success', creatures }
  } catch (error) {
    const cachedCreatures = readCachedSrdCatalog()
    if (cachedCreatures.length > 0) {
      return { status: 'cache', creatures: cachedCreatures }
    }

    return {
      status: 'network-error',
      creatures: [],
      error: error instanceof Error ? error : new Error('Unknown SRD catalog failure.'),
    }
  }
}

export async function loadSrdSpellCatalog(
  provider: SrdSpellCatalogProvider = new DnD5eApiProvider(),
): Promise<SrdSpellSummary[]> {
  try {
    const spells = await provider.listSpells()
    saveCachedSrdSpellCatalog(spells)
    return spells
  } catch {
    return readCachedSrdSpellCatalog()
  }
}

export async function importSrdCreature(
  index: string,
  provider: SrdProvider = new DnD5eApiProvider(),
): Promise<SrdSingleImportResult> {
  try {
    const creature = normalizeSrdCreature(await provider.fetchMonster(index))
    const cachedCreatures = readCachedSrdCreatures()
    saveCachedSrdCreatures([
      ...cachedCreatures.filter((cachedCreature) => cachedCreature.id !== creature.id),
      creature,
    ])
    return { status: 'success', creature }
  } catch (error) {
    const cachedCreature = readCachedSrdCreatures().find(
      (creature) => creature.id === `srd:${index}`,
    )
    if (cachedCreature) return { status: 'cache', creature: cachedCreature }

    return {
      status: 'network-error',
      error: error instanceof Error ? error : new Error('Unknown SRD import failure.'),
    }
  }
}
