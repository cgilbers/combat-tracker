import { beforeEach, describe, expect, it } from 'vitest'
import {
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

    expect(backup.version).toBe(1)
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
      isStarted: true,
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

  it('rejects malformed backups', () => {
    expect(() => parseBackup('{"version": 2}')).toThrow()
    expect(() => parseBackup('not json')).toThrow()
  })

  it('restores a valid backup into empty tables', async () => {
    await saveParty({ ...testParty, name: 'Old party' })

    await restoreBackup({
      version: 1,
      exportedAt: new Date().toISOString(),
      parties: [testParty],
      creatures: [],
      encounters: [],
    })

    expect(await database.parties.toArray()).toEqual([testParty])
  })
})