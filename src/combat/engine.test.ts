import { describe, expect, it } from 'vitest'
import { nextTurn, startEncounter, updateCreatureHp } from './engine'
import type { Encounter } from '../domain/types'

const encounter: Encounter = {
  id: 'encounter-1',
  name: 'Test encounter',
  partyId: 'party-1',
  combatants: [
    { id: 'pc-1', type: 'pc', refId: 'pc-1', name: 'Mira', initiative: 12 },
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

describe('combat engine', () => {
  it('orders combatants by descending initiative when combat starts', () => {
    const started = startEncounter(encounter)

    expect(started.combatants.map((combatant) => combatant.name)).toEqual([
      'Ash Wyrmling',
      'Mira',
    ])
    expect(started.currentTurnIndex).toBe(0)
  })

  it('advances turns and increments the round after wrapping', () => {
    const started = startEncounter(encounter)
    const next = nextTurn(started)
    const wrapped = nextTurn(next)

    expect(next.combatants[next.currentTurnIndex].name).toBe('Mira')
    expect(wrapped.round).toBe(2)
    expect(wrapped.currentTurnIndex).toBe(0)
  })

  it('clamps creature HP and marks a creature defeated at zero', () => {
    const started = startEncounter(encounter)
    const damaged = updateCreatureHp(started, 'creature-1', -17)
    const healed = updateCreatureHp(damaged, 'creature-1', 99)

    expect(damaged.combatants[0].currentHp).toBe(0)
    expect(damaged.combatants[0].isDefeated).toBe(true)
    expect(healed.combatants[0].currentHp).toBe(10)
    expect(healed.combatants[0].isDefeated).toBe(false)
  })

  it('does not add HP or AC to PC combatants', () => {
    const started = startEncounter(encounter)
    const updated = updateCreatureHp(started, 'pc-1', -4)
    const updatedPc = updated.combatants.find((combatant) => combatant.id === 'pc-1')

    expect(updatedPc).toEqual({
      id: 'pc-1',
      type: 'pc',
      refId: 'pc-1',
      name: 'Mira',
      initiative: 12,
    })
    expect(updatedPc).not.toHaveProperty('currentHp')
    expect(updatedPc).not.toHaveProperty('ac')
  })
})