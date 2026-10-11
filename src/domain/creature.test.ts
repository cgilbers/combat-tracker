import { describe, expect, it } from 'vitest'
import { validateCreature } from './creature'
import type { Creature } from './types'

const creature: Creature = {
  id: 'creature-1',
  source: 'custom',
  name: 'Ash Wyrmling',
  ac: 13,
  hpAverage: 18,
  dexterityModifier: 1,
}

describe('creature validation', () => {
  it('accepts a valid creature with optional stat-block details', () => {
    expect(
      validateCreature({
        ...creature,
        abilities: { str: 14, dex: 12, con: 13, int: 8, wis: 11, cha: 10 },
        actions: [{ name: 'Bite', description: 'Melee Weapon Attack.' }],
        bossResources: {
          spellSlots: { 1: 2 },
          legendaryActions: 2,
          legendaryResistances: 1,
          hasLairActions: true,
        },
      }),
    ).toEqual([])
  })

  it('rejects invalid required combat values and incomplete ability scores', () => {
    expect(
      validateCreature({
        ...creature,
        name: ' ',
        ac: 0,
        hpAverage: 0,
        abilities: { str: 14, dex: -1, con: 13, int: 8, wis: 11, cha: 10 },
      }),
    ).toEqual([
      'Name is required.',
      'AC must be a positive whole number.',
      'Average HP must be a positive whole number.',
      'Dexterity score must be a positive whole number.',
    ])
  })

  it('rejects negative resource limits and unnamed actions', () => {
    expect(
      validateCreature({
        ...creature,
        actions: [{ name: ' ', description: 'A claw attack.' }],
        bossResources: { spellSlots: { 1: -1 }, legendaryActions: -2 },
      }),
    ).toEqual([
      'Actions must each have a name and description.',
      'Spell slot limits must be non-negative whole numbers for levels 1–9.',
      'Legendary actions must be a non-negative whole number.',
    ])
  })
})
