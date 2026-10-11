import type { Creature, CreatureAction } from '../domain/types'

export const SRD_CACHE_KEY = 'combat-tracker:srd-creatures'
export const SRD_ATTRIBUTION =
  'D&D 5e SRD creature data is provided by the D&D 5e API and is used under the Open Gaming License and the SRD terms described by Wizards of the Coast.'

export type SrdProvider = {
  listMonsters(): Promise<string[]>
  fetchMonster(index: string): Promise<unknown>
}

export type SrdImportResult =
  | {
      status: 'success'
      creatures: Creature[]
    }
  | {
      status: 'cache'
      creatures: Creature[]
      cachedAt: string
    }
  | {
      status: 'network-error'
      creatures: []
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
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 10
  return 10
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

export function normalizeSrdCreature(raw: unknown): Creature {
  const record = (raw ?? {}) as Record<string, unknown>
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'Unnamed SRD creature'
  const index = typeof record.index === 'string' && record.index.trim() ? record.index.trim() : name.toLowerCase().replace(/\s+/g, '-')
  const armorClass = Array.isArray(record.armor_class)
    ? (record.armor_class as Array<Record<string, unknown>>).find((entry) => typeof entry.value === 'number' || typeof entry.value === 'string')
    : undefined
  const ac = asNumber(armorClass?.value) ?? asNumber(record.ac) ?? 10
  const hpAverage = asNumber(record.hit_points) ?? 1
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
  const traits = toActionList(record.special_abilities)
  const actions = toActionList(record.actions)
  const reactions = toActionList(record.reactions)
  const legendaryActions = toActionList(record.legendary_actions)
  const lairActions = toActionList(record.lair_actions)
  const spellcastingValue = Array.isArray(record.spellcasting)
    ? (record.spellcasting as Array<Record<string, unknown>>)
        .map((entry) => `${entry.name ?? 'Spellcasting'}: ${entry.desc ?? ''}`.trim())
        .filter(Boolean)
        .join('\n')
    : undefined

  const bossResources =
    legendaryActions || lairActions || spellcastingValue
      ? {
          ...(legendaryActions ? { legendaryActions: legendaryActions.length } : {}),
          ...(lairActions ? { hasLairActions: true } : {}),
          ...(spellcastingValue ? { spellSlots: { 1: 0 } } : {}),
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
    challengeRating:
      typeof challenge?.cr === 'number'
        ? challenge.cr
        : typeof challenge?.rating === 'number'
          ? challenge.rating
          : undefined,
    xp,
    traits,
    actions,
    reactions,
    legendaryActions,
    lairActions,
    spellcasting: spellcastingValue,
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
      return typeof candidate.id === 'string' && typeof candidate.name === 'string'
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

export class DnD5eApiProvider implements SrdProvider {
  readonly baseUrl: string

  constructor(baseUrl = 'https://www.dnd5eapi.co/api') {
    this.baseUrl = baseUrl
  }

  async listMonsters(): Promise<string[]> {
    const payload = await this.fetchJson(`${this.baseUrl}/monsters`)
    const results = typeof payload === 'object' && payload !== null && 'results' in payload
      ? (payload as { results?: Array<{ index?: string }> }).results ?? []
      : []

    return results
      .map((entry) => entry.index)
      .filter((index): index is string => typeof index === 'string' && index.trim() !== '')
  }

  async fetchMonster(index: string): Promise<unknown> {
    return this.fetchJson(`${this.baseUrl}/monsters/${index}`)
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`SRD request failed for ${url}: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
}

export async function fetchSrdCreatures(
  provider: SrdProvider = new DnD5eApiProvider(),
): Promise<SrdImportResult> {
  try {
    const monsters = await provider.listMonsters()
    const creatureData = await Promise.all(
      monsters.map((monster) => provider.fetchMonster(monster)),
    )
    const creatures = creatureData.map((monster) => normalizeSrdCreature(monster))
    saveCachedSrdCreatures(creatures)
    return { status: 'success', creatures }
  } catch (error) {
    const cachedCreatures = readCachedSrdCreatures()
    if (cachedCreatures.length > 0) {
      return {
        status: 'cache',
        creatures: cachedCreatures,
        cachedAt: new Date().toISOString(),
      }
    }

    return {
      status: 'network-error',
      creatures: [],
      error: error instanceof Error ? error : new Error('Unknown SRD import failure.'),
    }
  }
}

export const loadSrdCreatures = fetchSrdCreatures
export const importSrdCreatures = fetchSrdCreatures
export const writeCachedCreatures = saveCachedSrdCreatures
export const readCachedCreatures = readCachedSrdCreatures
export const DnD5eApi = DnD5eApiProvider
export const DnD5eApiAdapter = DnD5eApiProvider
export const createSrdProvider = () => new DnD5eApiProvider()
