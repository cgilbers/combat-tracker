import { describe, expect, it } from 'vitest'
import { nextTurn, startEncounter, updateCreatureHp } from './engine'
import type { Encounter } from '../domain/types'

const encounter: Encounter = {
  id: 'encounter-1',
  name: 'Test encounter',
  combatants: [
    {
      id: 'creature-1',
      type: 'creature',
      refId: 'creature-1',
      name: 'Ash Wyrmling',
      initiative: 18,
      currentHp: 10,
      maxHp: 10,
      ac: 13,
    },
  ],
  round: 1,
  currentTurnIndex: 0,
  isStarted: false,
}

const party = {
  id: 'party-1',
  name: 'The Lantern Company',
  members: [{ id: 'pc-1', name: 'Mira', notes: 'Wizard' }],
}

const startTestEncounter = (value: Encounter = encounter) =>
  startEncounter(value, party, { 'pc-1': 12 }, () => 'combatant-pc-1')

describe('combat engine', () => {
  it('adds the selected party when combat starts without adding PC HP or AC', () => {
    const started = startTestEncounter()

    expect(started.combatants.map((combatant) => combatant.name)).toEqual([
      'Ash Wyrmling',
      'Mira',
    ])
    expect(started.currentTurnIndex).toBe(0)
    expect(started.partyId).toBe('party-1')
    expect(started.combatants[1]).toEqual({
      id: 'combatant-pc-1',
      type: 'pc',
      refId: 'pc-1',
      name: 'Mira',
      initiative: 12,
    })
  })

  it('does not add party members to an encounter before it starts', () => {
    expect(encounter.combatants).toHaveLength(1)
    expect(encounter.partyId).toBeUndefined()
  })

  it('rejects starting when a PC has no initiative', () => {
    expect(() =>
      startEncounter(encounter, party, {}, () => 'combatant-pc-1'),
    ).toThrow('Initiative is required for Mira.')
  })

  it('advances turns and increments the round after wrapping', () => {
    const started = startTestEncounter()
    const next = nextTurn(started)
    const wrapped = nextTurn(next)

    expect(next.combatants[next.currentTurnIndex].name).toBe('Mira')
    expect(wrapped.round).toBe(2)
    expect(wrapped.currentTurnIndex).toBe(0)
  })

  it('clamps creature HP and marks a creature defeated at zero', () => {
    const started = startTestEncounter()
    const damaged = updateCreatureHp(started, 'creature-1', -17)
    const healed = updateCreatureHp(damaged, 'creature-1', 99)

    expect(damaged.combatants[0].currentHp).toBe(0)
    expect(damaged.combatants[0].isDefeated).toBe(true)
    expect(healed.combatants[0].currentHp).toBe(10)
    expect(healed.combatants[0].isDefeated).toBe(false)
  })

  it('does not add HP or AC to PC combatants', () => {
    const started = startTestEncounter()
    const updated = updateCreatureHp(started, 'combatant-pc-1', -4)
    const updatedPc = updated.combatants.find(
      (combatant) => combatant.id === 'combatant-pc-1',
    )

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
})