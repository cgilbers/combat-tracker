import { beforeEach, describe, expect, it } from 'vitest'
import { createBackup, database, parseBackup, restoreBackup, saveParty } from './database'
import type { Party } from '../domain/types'

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