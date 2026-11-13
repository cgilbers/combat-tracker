import { describe, expect, it } from 'vitest'
import {
  activateEncounter,
  addCreatureGroup,
  completeEncounter,
  createDraftEncounter,
  duplicateEncounter,
  nextTurn,
  pauseEncounter,
  rollAllCreatureGroupInitiatives,
  rollCreatureGroupInitiative,
  removeCreatureGroup,
  startEncounter,
  updateCreatureGroup,
  updateCreatureHp,
} from './engine'
import type { Creature, Encounter } from '../domain/types'

const creature: Creature = {
  id: 'creature-1',
  source: 'custom',
  name: 'Ash Wyrmling',
  ac: 13,
  hpAverage: 10,
  dexterityModifier: 1,
}

const encounter: Encounter = {
  id: 'encounter-1',
  name: 'Test encounter',
  status: 'draft',
  creatureGroups: [
    { id: 'group-1', creatureId: creature.id, quantity: 1, initiative: 18 },
  ],
  creatureSnapshots: { [creature.id]: creature },
  combatants: [],
  round: 1,
  currentTurnIndex: 0,
}

const party = {
  id: 'party-1',
  name: 'The Lantern Company',
  members: [{ id: 'pc-1', name: 'Mira', notes: 'Wizard' }],
}

const startTestEncounter = (value: Encounter = encounter) =>
  startEncounter(value, party, { 'pc-1': 12 }, () => 'combatant-pc-1')

describe('combat engine', () => {
  it('creates a named draft encounter without run state', () => {
    expect(createDraftEncounter('encounter-new', '  Watchtower  ')).toEqual({
      id: 'encounter-new',
      name: 'Watchtower',
      status: 'draft',
      creatureGroups: [],
      creatureSnapshots: {},
      combatants: [],
      round: 1,
      currentTurnIndex: 0,
    })
  })

  it('adds different creature types as separate groups and snapshots each type', () => {
    const goblin: Creature = {
      id: 'goblin',
      source: 'custom',
      name: 'Goblin',
      ac: 15,
      hpAverage: 7,
      dexterityModifier: 2,
    }
    const ogre: Creature = {
      id: 'ogre',
      source: 'custom',
      name: 'Ogre',
      ac: 11,
      hpAverage: 59,
      dexterityModifier: -1,
    }

    let id = 0
    const createId = () => `combatant-${id++}`
    const emptyEncounter = createDraftEncounter('new-encounter', 'Mixed group')
    const withGoblins = addCreatureGroup(emptyEncounter, goblin, 2, createId)
    const withOgre = addCreatureGroup(withGoblins, ogre, 1, createId)

    expect(withOgre.creatureGroups.map(({ creatureId, quantity }) => ({
      creatureId,
      quantity,
    }))).toEqual([
      { creatureId: 'goblin', quantity: 2 },
      { creatureId: 'ogre', quantity: 1 },
    ])
    expect(withOgre.creatureSnapshots).toEqual({ goblin, ogre })
  })

  it('reuses the encounter snapshot when adding the same creature after library changes', () => {
    const goblin: Creature = {
      id: 'goblin',
      source: 'custom',
      name: 'Goblin',
      ac: 15,
      hpAverage: 7,
      dexterityModifier: 2,
    }

    const first = addCreatureGroup(createDraftEncounter('draft', 'Draft'), goblin, 1, () => 'g1')
    const changedGoblin = { ...goblin, name: 'Goblin Chief', hpAverage: 20 }
    const updated = addCreatureGroup(first, changedGoblin, 2, () => 'g2')

    expect(updated.creatureGroups).toHaveLength(2)
    expect(updated.creatureSnapshots.goblin).toEqual(goblin)
  })

  it('updates and removes creature groups while preserving per-creature quantity rules', () => {
    const withSecondGroup = addCreatureGroup(encounter, creature, 2, () => 'group-2')
    const resized = updateCreatureGroup(withSecondGroup, 'group-2', { quantity: 5 })
    const removed = removeCreatureGroup(resized, 'group-1')

    expect(resized.creatureGroups[1].quantity).toBe(5)
    expect(removed.creatureGroups.map((group) => group.id)).toEqual(['group-2'])
  })

  it('starts combat by creating individual creature combatants and copying PCs', () => {
    const started = startTestEncounter()

    expect(started.combatants.map((combatant) => combatant.name)).toEqual([
      'Ash Wyrmling',
      'Mira',
    ])
    expect(started.currentTurnIndex).toBe(0)
    expect(started.partyId).toBe('party-1')
    expect(started.status).toBe('active')
    expect(started.combatants[1]).toEqual({
      id: 'combatant-pc-1',
      type: 'pc',
      refId: 'pc-1',
      name: 'Mira',
      initiative: 12,
    })
  })

  it('gives each creature group a shared initiative and individual HP', () => {
    const firstGroup = { ...encounter, creatureGroups: [{ ...encounter.creatureGroups[0], quantity: 2 }] }
    const secondGroup = addCreatureGroup(firstGroup, creature, 1, () => 'group-2')
    const withInitiative = updateCreatureGroup(
      updateCreatureGroup(secondGroup, 'group-1', { initiative: 16 }),
      'group-2',
      { initiative: 9 },
    )
    const started = startEncounter(
      withInitiative,
      party,
      { 'pc-1': 12 },
      (() => {
        let id = 0
        return () => `run-${id++}`
      })(),
    )
    const creatureCombatants = started.combatants.filter(
      (combatant) => combatant.type === 'creature',
    )
    const damaged = updateCreatureHp(started, creatureCombatants[0].id, -5)

    expect(creatureCombatants.map((combatant) => combatant.initiative)).toEqual([
      16,
      16,
      9,
    ])
    expect(new Set(creatureCombatants.map((combatant) => combatant.groupId)).size).toBe(2)
    expect(damaged.combatants.filter((combatant) => combatant.type === 'creature').map(
      (combatant) => combatant.currentHp,
    )).toEqual([5, 10, 10])
  })

  it('rolls one d20 plus Dexterity for each group and shares that result with its members', () => {
    const group = { ...encounter.creatureGroups[0], quantity: 3, initiative: null }
    const draft = { ...encounter, creatureGroups: [group] }
    let rolls = 0
    const rolled = rollCreatureGroupInitiative(draft, group.id, () => {
      rolls += 1
      return 16
    })
    let id = 0
    const started = startEncounter(rolled, party, { 'pc-1': 12 }, () => `combatant-${id++}`)

    expect(rolls).toBe(1)
    expect(rolled.creatureGroups[0].initiative).toBe(17)
    expect(
      started.combatants
        .filter((combatant) => combatant.type === 'creature')
        .map((combatant) => combatant.initiative),
    ).toEqual([17, 17, 17])
  })

  it('rolls each group once when rolling all creature groups', () => {
    const withSecondGroup = addCreatureGroup(encounter, creature, 2, () => 'group-2')
    let roll = 0
    const rolled = rollAllCreatureGroupInitiatives(withSecondGroup, () => [20, 1][roll++])

    expect(roll).toBe(2)
    expect(rolled.creatureGroups.map((group) => group.initiative)).toEqual([21, 2])
  })

  it('rejects invalid d20 results', () => {
    expect(() =>
      rollCreatureGroupInitiative(encounter, 'group-1', () => 21),
    ).toThrow('A d20 roll must be an integer from 1 to 20.')
  })

  it('orders tied PCs before creatures and preserves roster order within each type', () => {
    const tiedGroup = { ...encounter.creatureGroups[0], quantity: 2, initiative: 12 }
    const tiedParty = {
      ...party,
      members: [
        ...party.members,
        { id: 'pc-2', name: 'Tarin' },
      ],
    }
    const started = startEncounter(
      { ...encounter, creatureGroups: [tiedGroup] },
      tiedParty,
      { 'pc-1': 12, 'pc-2': 12 },
      (() => {
        let id = 0
        return () => `tied-${id++}`
      })(),
    )

    expect(started.combatants.map((combatant) => combatant.name)).toEqual([
      'Mira',
      'Tarin',
      'Ash Wyrmling 1',
      'Ash Wyrmling 2',
    ])
  })

  it('does not add combatants to a draft before it starts', () => {
    expect(encounter.combatants).toHaveLength(0)
    expect(encounter.partyId).toBeUndefined()
  })

  it('rejects starting when a PC has no initiative', () => {
    expect(() =>
      startEncounter(encounter, party, {}, () => 'combatant-pc-1'),
    ).toThrow('Initiative is required for Mira.')
  })

  it('rejects starting without a PC party member', () => {
    expect(() =>
      startEncounter(encounter, { ...party, members: [] }, {}, () => 'unused'),
    ).toThrow('Choose a party with at least one player character before starting.')
  })

  it('advances turns and increments the round after wrapping', () => {
    const started = startTestEncounter()
    const next = nextTurn(started)
    const wrapped = nextTurn(next)

    expect(next.combatants[next.currentTurnIndex].name).toBe('Mira')
    expect(wrapped.round).toBe(2)
    expect(wrapped.currentTurnIndex).toBe(0)
  })

  it('skips defeated combatants and rolls the round over after the last ready combatant', () => {
    const group = { ...encounter.creatureGroups[0], quantity: 2 }
    let id = 0
    const started = startEncounter(
      { ...encounter, creatureGroups: [group] },
      party,
      { 'pc-1': 12 },
      () => `combatant-${id++}`,
    )
    const secondCreature = started.combatants.find(
      (combatant) => combatant.name.endsWith('2'),
    )
    const withDefeatedCreature = updateCreatureHp(started, secondCreature!.id, -10)

    const next = nextTurn(withDefeatedCreature)
    const wrapped = nextTurn(next)

    expect(next.combatants[next.currentTurnIndex].name).toBe('Mira')
    expect(wrapped.combatants[wrapped.currentTurnIndex].name).toBe('Ash Wyrmling 1')
    expect(wrapped.round).toBe(2)
  })

  it('clamps creature HP and marks a creature defeated at zero', () => {
    const started = startTestEncounter()
    const creatureId = started.combatants.find((combatant) => combatant.type === 'creature')!.id
    const damaged = updateCreatureHp(started, creatureId, -17)
    const healed = updateCreatureHp(damaged, creatureId, 99)

    const damagedCreature = damaged.combatants.find((combatant) => combatant.id === creatureId)
    const healedCreature = healed.combatants.find((combatant) => combatant.id === creatureId)
    expect(damagedCreature?.currentHp).toBe(0)
    expect(damagedCreature?.isDefeated).toBe(true)
    expect(healedCreature?.currentHp).toBe(10)
    expect(healedCreature?.isDefeated).toBe(false)
  })

  it('does not add HP or AC to PC combatants', () => {
    const started = startTestEncounter()
    const updated = updateCreatureHp(started, 'combatant-pc-1', -4)
    const updatedPc = updated.combatants.find((combatant) => combatant.type === 'pc')

    expect(updatedPc).toEqual({
      id: 'combatant-pc-1',
      type: 'pc',
      refId: 'pc-1',
      name: 'Mira',
      initiative: 12,
    })
    expect(updatedPc).not.toHaveProperty('currentHp')
    expect(updatedPc).not.toHaveProperty('ac')
  })

  it('pauses and resumes encounters while allowing only one active run', () => {
    const first = startTestEncounter()
    const second = startEncounter(
      { ...encounter, id: 'encounter-2' },
      party,
      { 'pc-1': 11 },
      () => 'second-combatant',
    )
    const pausedFirst = pauseEncounter(first)
    const activeEncounters = activateEncounter([pausedFirst, second], first.id)

    expect(activeEncounters.map((item) => item.status)).toEqual(['active', 'paused'])
  })

  it('completes and duplicates an encounter without carrying run state', () => {
    const completed = completeEncounter(startTestEncounter())
    let id = 0
    const duplicate = duplicateEncounter(completed, () => `duplicate-${id++}`)

    expect(completed.status).toBe('complete')
    expect(duplicate).toMatchObject({
      status: 'draft',
      partyId: undefined,
      combatants: [],
      round: 1,
      currentTurnIndex: 0,
    })
    expect(duplicate.creatureSnapshots).toEqual(completed.creatureSnapshots)
    expect(duplicate.creatureGroups[0]).toMatchObject({
      creatureId: creature.id,
      quantity: 1,
      initiative: null,
    })
  })
})