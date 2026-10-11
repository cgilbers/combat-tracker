import Dexie, { type Table } from 'dexie'
import type { Creature, Encounter, Party } from '../domain/types'

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
  }
}

export const database = new CombatTrackerDatabase()

export type PersistedBackup = {
  version: 1
  exportedAt: string
  parties: Party[]
  creatures: Creature[]
  encounters: Encounter[]
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
  await database.encounters.put(encounter)
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

  return { parties, creatures, encounters }
}

export async function saveAppData(data: { encounter: Encounter | null }): Promise<void> {
  await database.transaction(
    'rw',
    database.encounters,
    async () => {
      await database.encounters.clear()
      if (data.encounter) await database.encounters.put(data.encounter)
    },
  )
}

export async function createBackup(): Promise<PersistedBackup> {
  const data = await loadAppData()
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

export async function restoreBackup(backup: PersistedBackup): Promise<void> {
  if (backup.version !== 1) {
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
      await database.encounters.bulkPut(backup.encounters)
    },
  )
}

export function parseBackup(json: string): PersistedBackup {
  const value: unknown = JSON.parse(json)
  if (!isPersistedBackup(value)) {
    throw new Error('The selected file is not a valid combat tracker backup.')
  }
  return value
}

function isPersistedBackup(value: unknown): value is PersistedBackup {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<PersistedBackup>
  return (
    backup.version === 1 &&
    typeof backup.exportedAt === 'string' &&
    Array.isArray(backup.parties) &&
    Array.isArray(backup.creatures) &&
    Array.isArray(backup.encounters)
  )
}