import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SRD_CACHE_KEY,
  DnD5eApiProvider,
  importSrdCreature,
  loadSrdCatalog,
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
  vi.unstubAllGlobals()
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
  challenge_rating: 0.25,
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
      challengeRating: 0.25,
      skills: { Stealth: 6 },
      traits: [{ name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action.' }],
    })
  })

  it('rejects incomplete stat blocks instead of creating success-shaped defaults', () => {
    expect(() =>
      normalizeSrdCreature({
        ...sampleApiCreature,
        hit_points: undefined,
      }),
    ).toThrow('SRD creature response for Goblin has invalid hit points.')
  })

  it('stores and reads a local SRD cache', () => {
    const creature = normalizeSrdCreature(sampleApiCreature)

    saveCachedSrdCreatures([creature])

    expect(readCachedSrdCreatures()).toEqual([creature])
    expect(globalThis.localStorage.getItem(SRD_CACHE_KEY)).toContain('"source":"srd"')
  })

  it('excludes non-SRD records from the SRD cache', () => {
    globalThis.localStorage.setItem(
      SRD_CACHE_KEY,
      JSON.stringify({
        creatures: [
          { ...normalizeSrdCreature(sampleApiCreature), source: 'custom' },
          { ...normalizeSrdCreature(sampleApiCreature), id: 'custom:goblin' },
        ],
      }),
    )

    expect(readCachedSrdCreatures()).toEqual([])
  })

  it('lists catalog summaries without downloading every stat block', async () => {
    let detailRequests = 0
    const result = await loadSrdCatalog({
      listMonsters: async () => [
        { index: 'goblin', name: 'Goblin' },
        { index: 'owlbear', name: 'Owlbear' },
      ],
      fetchMonster: async () => {
        detailRequests += 1
        return sampleApiCreature
      },
    })

    expect(result).toEqual({
      status: 'success',
      creatures: [
        { index: 'goblin', name: 'Goblin' },
        { index: 'owlbear', name: 'Owlbear' },
      ],
    })
    expect(detailRequests).toBe(0)
  })

  it('imports and caches only the selected SRD creature', async () => {
    const fetched: string[] = []
    const result = await importSrdCreature('goblin', {
      listMonsters: async () => [{ index: 'goblin', name: 'Goblin' }],
      fetchMonster: async (index) => {
        fetched.push(index)
        return sampleApiCreature
      },
    })

    expect(result.status).toBe('success')
    if (result.status === 'network-error') throw result.error
    expect(result.creature).toMatchObject({ id: 'srd:goblin', source: 'srd' })
    expect(fetched).toEqual(['goblin'])
    expect(readCachedSrdCreatures()).toEqual([result.creature])
  })

  it('uses the catalog cache when the provider is unavailable', async () => {
    await loadSrdCatalog({
      listMonsters: async () => [{ index: 'goblin', name: 'Goblin' }],
      fetchMonster: async () => sampleApiCreature,
    })

    const result = await loadSrdCatalog({
      listMonsters: async () => {
        throw new Error('network unavailable')
      },
      fetchMonster: async () => sampleApiCreature,
    })

    expect(result).toMatchObject({
      status: 'cache',
      creatures: [{ index: 'goblin', name: 'Goblin' }],
    })
  })

  it('reports a detail-fetch failure without indicating the creature was imported', async () => {
    const result = await importSrdCreature('goblin', {
      listMonsters: async () => [{ index: 'goblin', name: 'Goblin' }],
      fetchMonster: async () => {
        throw new Error('network unavailable')
      },
    })

    expect(result.status).toBe('network-error')
  })

  it('returns an imported creature from the cache when detail fetching fails offline', async () => {
    const creature = normalizeSrdCreature(sampleApiCreature)
    saveCachedSrdCreatures([creature])

    const result = await importSrdCreature('goblin', {
      listMonsters: async () => [{ index: 'goblin', name: 'Goblin' }],
      fetchMonster: async () => {
        throw new Error('network unavailable')
      },
    })

    expect(result).toEqual({ status: 'cache', creature })
  })

  it('requests resources through the current versioned production API route', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ index: 'goblin', name: 'Goblin' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleApiCreature,
      })
    vi.stubGlobal('fetch', fetchMock)
    const provider = new DnD5eApiProvider()

    await provider.listMonsters()
    await provider.fetchMonster('goblin')

    expect(fetchMock.mock.calls).toEqual([
      ['https://www.dnd5eapi.co/api/2014/monsters'],
      ['https://www.dnd5eapi.co/api/2014/monsters/goblin'],
    ])
  })
})
