import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import {
  CombatTrackerDatabase,
  createBackup,
  database,
  deleteCreature,
  deleteParty,
  loadAppData,
  parseBackup,
  restoreBackup,
  saveCreature,
  saveAppData,
  saveEncounter,
  saveParty,
} from './database'
import type { Creature, Encounter, Party } from '../domain/types'

const testParty: Party = {
  id: 'party-1',
  name: 'The Lantern Company',
  members: [{ id: 'pc-1', name: 'Mira' }],
}

beforeEach(async () => {
  await database.parties.clear()
  await database.creatures.clear()
  await database.encounters.clear()
})

describe('combat tracker database', () => {
  it('stores and exports parties in a versioned backup', async () => {
    await saveParty(testParty)

    const backup = await createBackup()

    expect(backup.version).toBe(2)
    expect(backup.parties).toEqual([testParty])
  })

  it('updates or deletes one party without replacing other parties', async () => {
    const anotherParty: Party = {
      id: 'party-2',
      name: 'The Ashen Road',
      members: [],
    }
    const creature: Creature = {
      id: 'creature-1',
      source: 'custom',
      name: 'Ash Wyrmling',
      ac: 13,
      hpAverage: 18,
      dexterityModifier: 1,
    }
    const startedEncounter: Encounter = {
      id: 'encounter-1',
      name: 'The Old Watchtower',
      status: 'paused',
      creatureGroups: [],
      creatureSnapshots: {},
      partyId: testParty.id,
      combatants: [
        {
          id: 'combatant-1',
          type: 'pc',
          refId: 'pc-1',
          name: 'Mira',
          initiative: 12,
        },
      ],
      round: 1,
      currentTurnIndex: 0,
    }
    const updatedParty = {
      ...testParty,
      name: 'The Lantern Company Revised',
      members: [{ id: 'pc-2', name: 'Tamsin', notes: 'Ranger' }],
    }

    await saveParty(testParty)
    await saveParty(anotherParty)
    await saveCreature(creature)
    await saveEncounter(startedEncounter)
    await saveParty(updatedParty)

    expect(await loadAppData()).toEqual({
      parties: [updatedParty, anotherParty],
      creatures: [creature],
      encounters: [startedEncounter],
    })

    await deleteParty(testParty.id)

    expect(await loadAppData()).toEqual({
      parties: [anotherParty],
      creatures: [creature],
      encounters: [startedEncounter],
    })
  })

  it('updates and deletes a creature without replacing other creatures', async () => {
    const anotherCreature: Creature = {
      id: 'creature-2',
      source: 'custom',
      name: 'Goblin',
      ac: 15,
      hpAverage: 7,
      dexterityModifier: 2,
    }
    const updatedCreature: Creature = {
      id: 'creature-1',
      source: 'custom',
      name: 'Ash Wyrmling',
      ac: 14,
      hpAverage: 20,
      dexterityModifier: 1,
      speed: '30 ft., fly 60 ft.',
      abilities: { str: 14, dex: 12, con: 13, int: 8, wis: 11, cha: 10 },
    }

    await saveCreature({ ...updatedCreature, ac: 13 })
    await saveCreature(anotherCreature)
    await saveCreature(updatedCreature)

    expect((await loadAppData()).creatures).toEqual([
      updatedCreature,
      anotherCreature,
    ])

    await saveAppData({ encounter: null })

    expect((await loadAppData()).creatures).toEqual([
      updatedCreature,
      anotherCreature,
    ])

    await deleteCreature(updatedCreature.id)

    expect((await loadAppData()).creatures).toEqual([anotherCreature])
  })

  it('keeps multiple saved encounters when a single encounter is updated', async () => {
    const firstEncounter: Encounter = {
      id: 'encounter-1',
      name: 'The Old Watchtower',
      status: 'draft',
      creatureGroups: [
        { id: 'group-1', creatureId: 'creature-1', quantity: 1, initiative: null },
      ],
      creatureSnapshots: {
        'creature-1': {
          id: 'creature-1',
          source: 'custom',
          name: 'Ash Wyrmling',
          ac: 13,
          hpAverage: 18,
          dexterityModifier: 1,
        },
      },
      combatants: [{ id: 'combatant-1', type: 'creature', refId: 'creature-1', name: 'Ash Wyrmling', initiative: null }],
      round: 1,
      currentTurnIndex: 0,
    }
    const secondEncounter: Encounter = {
      id: 'encounter-2',
      name: 'The Red Hall',
      status: 'active',
      creatureGroups: [],
      creatureSnapshots: {},
      combatants: [{ id: 'combatant-2', type: 'pc', refId: 'pc-1', name: 'Mira', initiative: 15 }],
      round: 1,
      currentTurnIndex: 0,
    }
    const updatedEncounter: Encounter = {
      ...firstEncounter,
      name: 'The Old Watchtower Revised',
      round: 2,
    }

    await saveEncounter(firstEncounter)
    await saveEncounter(secondEncounter)
    await saveAppData({ encounter: updatedEncounter })

    const persisted = await loadAppData()
    expect(persisted.encounters).toHaveLength(2)
    expect(persisted.encounters).toEqual(
      expect.arrayContaining([
        updatedEncounter,
        { ...secondEncounter, status: 'paused' },
      ]),
    )
  })

  it('preserves an encounter snapshot when its library creature is deleted', async () => {
    const savedCreature: Creature = {
      id: 'snapshot-creature',
      source: 'custom',
      name: 'Stone Golem',
      ac: 17,
      hpAverage: 126,
      dexterityModifier: -1,
      traits: [{ name: 'Immutable Form', description: 'Unaffected by alteration.' }],
    }
    const encounterWithSnapshot: Encounter = {
      id: 'snapshot-encounter',
      name: 'The Courtyard',
      status: 'draft',
      creatureGroups: [
        {
          id: 'snapshot-group',
          creatureId: savedCreature.id,
          quantity: 2,
          initiative: null,
        },
      ],
      creatureSnapshots: { [savedCreature.id]: savedCreature },
      combatants: [],
      round: 1,
      currentTurnIndex: 0,
    }

    await saveCreature(savedCreature)
    await saveEncounter(encounterWithSnapshot)
    await deleteCreature(savedCreature.id)

    expect(await loadAppData()).toMatchObject({
      creatures: [],
      encounters: [{ creatureSnapshots: { [savedCreature.id]: savedCreature } }],
    })
  })

  it('rejects malformed backups', () => {
    expect(() => parseBackup('{"version": 2}')).toThrow()
    expect(() => parseBackup('not json')).toThrow()
  })

  it('migrates version-1 backup encounters to paused snapshots and groups', () => {
    const creature: Creature = {
      id: 'creature-1',
      source: 'custom',
      name: 'Ash Wyrmling',
      ac: 13,
      hpAverage: 18,
      dexterityModifier: 1,
    }
    const backup = parseBackup(
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        parties: [],
        creatures: [creature],
        encounters: [
          {
            id: 'legacy-encounter',
            name: 'Old Watchtower',
            combatants: [
              {
                id: 'legacy-combatant',
                type: 'creature',
                refId: creature.id,
                name: creature.name,
                initiative: 14,
                currentHp: 10,
                maxHp: 18,
                ac: 13,
              },
            ],
            round: 2,
            currentTurnIndex: 0,
            isStarted: true,
          },
        ],
      }),
    )

    expect(backup.version).toBe(2)
    expect(backup.encounters[0]).toMatchObject({
      status: 'paused',
      creatureSnapshots: { [creature.id]: creature },
      creatureGroups: [
        { creatureId: creature.id, quantity: 1, initiative: 14 },
      ],
      combatants: [{ groupId: 'legacy-encounter-group-0' }],
    })
  })

  it('migrates existing IndexedDB encounter records', async () => {
    const name = `combat-tracker-migration-${Date.now()}`
    const legacyDatabase = new Dexie(name)
    legacyDatabase.version(1).stores({
      parties: 'id, name',
      creatures: 'id, name, source',
      encounters: 'id, partyId, name, isStarted',
    })
    await legacyDatabase.open()
    await legacyDatabase.table('creatures').put({
      id: 'creature-legacy',
      source: 'custom',
      name: 'Goblin',
      ac: 15,
      hpAverage: 7,
      dexterityModifier: 2,
    })
    await legacyDatabase.table('encounters').put({
      id: 'encounter-legacy',
      name: 'Old Road',
      combatants: [
        {
          id: 'goblin-1',
          type: 'creature',
          refId: 'creature-legacy',
          name: 'Goblin',
          initiative: 12,
          currentHp: 7,
          maxHp: 7,
          ac: 15,
        },
      ],
      round: 1,
      currentTurnIndex: 0,
      isStarted: true,
    })
    legacyDatabase.close()

    const migratedDatabase = new CombatTrackerDatabase(name)
    try {
      await migratedDatabase.open()
      const migrated = await migratedDatabase.encounters.get('encounter-legacy')
      expect(migrated).toMatchObject({
        status: 'paused',
        creatureGroups: [
          { creatureId: 'creature-legacy', quantity: 1, initiative: 12 },
        ],
        creatureSnapshots: { 'creature-legacy': { name: 'Goblin', ac: 15 } },
      })
      expect(migrated).not.toHaveProperty('isStarted')
    } finally {
      migratedDatabase.close()
      await migratedDatabase.delete()
    }
  })

  it('pauses the previous active encounter when another one becomes active', async () => {
    const activeFirst: Encounter = {
      id: 'active-1',
      name: 'First',
      status: 'active',
      creatureGroups: [],
      creatureSnapshots: {},
      combatants: [],
      round: 1,
      currentTurnIndex: 0,
    }
    const activeSecond = { ...activeFirst, id: 'active-2', name: 'Second' }

    await saveEncounter(activeFirst)
    await saveEncounter(activeSecond)

    expect(await database.encounters.get(activeFirst.id)).toMatchObject({ status: 'paused' })
    expect(await database.encounters.get(activeSecond.id)).toMatchObject({ status: 'active' })
  })

  it('restores a valid backup into empty tables', async () => {
    await saveParty({ ...testParty, name: 'Old party' })

    await restoreBackup({
      version: 2,
      exportedAt: new Date().toISOString(),
      parties: [testParty],
      creatures: [],
      encounters: [],
    })

    expect(await database.parties.toArray()).toEqual([testParty])
  })
})