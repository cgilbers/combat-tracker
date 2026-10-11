import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  SRD_CACHE_KEY,
  fetchSrdCreatures,
  normalizeSrdCreature,
  readCachedSrdCreatures,
  saveCachedSrdCreatures,
} from './srd'

const createMemoryStorage = () => {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

const memoryStorage = createMemoryStorage()

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  memoryStorage.clear()
})

const sampleApiCreature = {
  index: 'goblin',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  alignment: 'neutral evil',
  armor_class: [{ type: 'armor', value: 15 }],
  hit_points: 7,
  hit_dice: '2d6',
  speed: { walk: '30 ft.' },
  strength: 8,
  dexterity: 14,
  constitution: 10,
  intelligence: 10,
  wisdom: 8,
  charisma: 8,
  saving_throws: [{ name: 'Dex', value: 4 }],
  skills: [{ name: 'Stealth', value: 6 }],
  senses: { darkvision: '60 ft.' },
  languages: 'Common, Goblin',
  challenge: { xp: 50 },
  special_abilities: [{ name: 'Nimble Escape', desc: 'The goblin can take the Disengage or Hide action as a bonus action.' }],
  actions: [{ name: 'Scimitar', desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target.' }],
}

describe('SRD creature import', () => {
  it('normalizes SRD API data into the application creature model', () => {
    const creature = normalizeSrdCreature(sampleApiCreature)

    expect(creature).toMatchObject({
      id: 'srd:goblin',
      source: 'srd',
      name: 'Goblin',
      ac: 15,
      hpAverage: 7,
      hpFormula: '2d6',
      dexterityModifier: 2,
      type: 'humanoid',
      size: 'Small',
      alignment: 'neutral evil',
      skills: { Stealth: 6 },
      traits: [{ name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action.' }],
    })
  })

  it('stores and reads a local SRD cache', () => {
    const creature = normalizeSrdCreature(sampleApiCreature)

    saveCachedSrdCreatures([creature])

    expect(readCachedSrdCreatures()).toEqual([creature])
    expect(globalThis.localStorage.getItem(SRD_CACHE_KEY)).toContain('"source":"srd"')
  })

  it('returns a cache fallback when the provider fails and there is saved content', async () => {
    const creature = normalizeSrdCreature(sampleApiCreature)
    saveCachedSrdCreatures([creature])

    const result = await fetchSrdCreatures({
      listMonsters: async () => {
        throw new Error('network unavailable')
      },
      fetchMonster: async () => {
        throw new Error('network unavailable')
      },
    })

    expect(result.status).toBe('cache')
    expect(result.creatures).toEqual([creature])
  })

  it('reports a provider failure without pretending the import succeeded', async () => {
    const result = await fetchSrdCreatures({
      listMonsters: async () => {
        throw new Error('network unavailable')
      },
      fetchMonster: async () => {
        throw new Error('network unavailable')
      },
    })

    expect(result.status).toBe('network-error')
    expect(result.creatures).toEqual([])
  })
})
