import Dexie, { type Table } from 'dexie'
import type {
  CombatantState,
  Creature,
  Encounter,
  EncounterCreatureGroup,
  Party,
} from '../domain/types'

export class CombatTrackerDatabase extends Dexie {
  parties!: Table<Party, string>
  creatures!: Table<Creature, string>
  encounters!: Table<Encounter, string>

  constructor(name = 'combat-tracker') {
    super(name)
    this.version(1).stores({
      parties: 'id, name',
      creatures: 'id, name, source',
      encounters: 'id, partyId, name, isStarted',
    })
    this.version(2)
      .stores({
        parties: 'id, name',
        creatures: 'id, name, source',
        encounters: 'id, partyId, name, status',
      })
      .upgrade(async (transaction) => {
        const [creatures, oldEncounters] = await Promise.all([
          transaction.table('creatures').toArray() as Promise<Creature[]>,
          transaction.table('encounters').toArray() as Promise<LegacyEncounter[]>,
        ])
        const migrated = oldEncounters.map((encounter) =>
          migrateLegacyEncounter(encounter, creatures),
        )
        await transaction.table('encounters').bulkPut(migrated)
      })
  }
}

export const database = new CombatTrackerDatabase()

export type PersistedBackup = {
  version: 2
  exportedAt: string
  parties: Party[]
  creatures: Creature[]
  encounters: Encounter[]
}

type LegacyEncounter = Omit<
  Encounter,
  'status' | 'creatureGroups' | 'creatureSnapshots'
> & {
  isStarted?: boolean
}

type LegacyBackup = {
  version: 1
  exportedAt: string
  parties: Party[]
  creatures: Creature[]
  encounters: LegacyEncounter[]
}

function migrateLegacyEncounter(
  legacy: LegacyEncounter,
  creatures: Creature[],
): Encounter {
  const { isStarted, ...previousEncounter } = legacy
  const groupedCombatants = new Map<string, CombatantState[]>()
  for (const combatant of legacy.combatants ?? []) {
    if (combatant.type !== 'creature') continue
    const key = `${combatant.refId}:${combatant.initiative ?? 'unset'}`
    groupedCombatants.set(key, [...(groupedCombatants.get(key) ?? []), combatant])
  }

  const creatureSnapshots: Record<string, Creature> = {}
  const creatureGroups: EncounterCreatureGroup[] = []
  const groupIdsByKey = new Map<string, string>()
  let groupIndex = 0
  for (const [key, combatants] of groupedCombatants) {
    const first = combatants[0]
    const creature =
      creatures.find((item) => item.id === first.refId) ??
      ({
        id: first.refId,
        source: 'custom',
        name: first.name.replace(/(?: \(Group \d+\))?(?: \d+)?$/, ''),
        ac: first.ac ?? 10,
        hpAverage: first.maxHp ?? first.currentHp ?? 1,
        dexterityModifier: 0,
      } satisfies Creature)
    creatureSnapshots[creature.id] = structuredClone(creature)
    const groupId = `${legacy.id}-group-${groupIndex++}`
    groupIdsByKey.set(key, groupId)
    creatureGroups.push({
      id: groupId,
      creatureId: creature.id,
      quantity: combatants.length,
      initiative: first.initiative,
    })
  }

  const combatants = (legacy.combatants ?? []).map((combatant) => {
    if (combatant.type !== 'creature') return combatant
    const key = `${combatant.refId}:${combatant.initiative ?? 'unset'}`
    return { ...combatant, groupId: groupIdsByKey.get(key) }
  })

  return {
    ...previousEncounter,
    status: isStarted ? 'paused' : 'draft',
    creatureGroups,
    creatureSnapshots,
    combatants,
  }
}

export async function saveParty(party: Party): Promise<void> {
  await database.parties.put(party)
}

export async function deleteParty(partyId: string): Promise<void> {
  await database.parties.delete(partyId)
}

export async function saveCreature(creature: Creature): Promise<void> {
  await database.creatures.put(creature)
}

export async function deleteCreature(creatureId: string): Promise<void> {
  await database.creatures.delete(creatureId)
}

export async function saveEncounter(encounter: Encounter): Promise<void> {
  await database.transaction('rw', database.encounters, async () => {
    if (encounter.status === 'active') {
      await database.encounters
        .where('status')
        .equals('active')
        .and((savedEncounter) => savedEncounter.id !== encounter.id)
        .modify({ status: 'paused' })
    }
    await database.encounters.put(encounter)
  })
}

export async function deleteEncounter(encounterId: string): Promise<void> {
  await database.encounters.delete(encounterId)
}

export async function loadAppData(): Promise<{
  parties: Party[]
  creatures: Creature[]
  encounters: Encounter[]
}> {
  const [parties, creatures, encounters] = await Promise.all([
    database.parties.toArray(),
    database.creatures.toArray(),
    database.encounters.toArray(),
  ])

  const restoredEncounters = encounters.map((encounter) =>
    encounter.status === 'active' ? { ...encounter, status: 'paused' as const } : encounter,
  )
  if (restoredEncounters.some((encounter, index) => encounter !== encounters[index])) {
    await database.encounters.bulkPut(restoredEncounters)
  }

  return { parties, creatures, encounters: restoredEncounters }
}

export async function saveAppData(data: {
  encounter?: Encounter | null
  encounters?: Encounter[]
}): Promise<void> {
  if (data.encounter) await saveEncounter(data.encounter)
  if (data.encounters) {
    if (data.encounters.length === 0) return
    let activeEncounterFound = false
    const encounters = data.encounters.map((encounter) => {
      if (encounter.status !== 'active') return encounter
      if (activeEncounterFound) return { ...encounter, status: 'paused' as const }
      activeEncounterFound = true
      return encounter
    })
    await database.transaction('rw', database.encounters, async () => {
      await database.encounters.bulkPut(encounters)
    })
  }
}

export async function createBackup(): Promise<PersistedBackup> {
  const data = await loadAppData()
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

export async function restoreBackup(backup: PersistedBackup): Promise<void> {
  if (backup.version !== 2) {
    throw new Error('This backup version is not supported.')
  }

  await database.transaction(
    'rw',
    database.parties,
    database.creatures,
    database.encounters,
    async () => {
      await database.parties.clear()
      await database.creatures.clear()
      await database.encounters.clear()
      await database.parties.bulkPut(backup.parties)
      await database.creatures.bulkPut(backup.creatures)
      await database.encounters.bulkPut(
        backup.encounters.map((encounter) =>
          encounter.status === 'active' ? { ...encounter, status: 'paused' } : encounter,
        ),
      )
    },
  )
}

export function parseBackup(json: string): PersistedBackup {
  const value: unknown = JSON.parse(json)
  if (isPersistedBackup(value)) return value
  if (isLegacyBackup(value)) {
    return {
      ...value,
      version: 2,
      encounters: value.encounters.map((encounter) =>
        migrateLegacyEncounter(encounter, value.creatures),
      ),
    }
  }
  throw new Error('The selected file is not a valid combat tracker backup.')
}

function isPersistedBackup(value: unknown): value is PersistedBackup {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<PersistedBackup>
  return (
    backup.version === 2 &&
    typeof backup.exportedAt === 'string' &&
    Array.isArray(backup.parties) &&
    Array.isArray(backup.creatures) &&
    Array.isArray(backup.encounters)
  )
}

function isLegacyBackup(value: unknown): value is LegacyBackup {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<LegacyBackup>
  return (
    backup.version === 1 &&
    typeof backup.exportedAt === 'string' &&
    Array.isArray(backup.parties) &&
    Array.isArray(backup.creatures) &&
    Array.isArray(backup.encounters)
  )
}