import { describe, expect, it } from 'vitest'
import { buildInitiativeOrder } from './initiativeOrder'
import type { CombatantState } from '../domain/types'

const combatant = (id: string, initiative: number | null): CombatantState => ({
  id,
  type: 'pc',
  refId: id,
  name: id,
  initiative,
})

describe('initiative order reminders', () => {
  it('places the lair action reminder at 20 after combatants tied at 20', () => {
    const items = buildInitiativeOrder(
      [
        combatant('first', 25),
        combatant('tied-pc', 20),
        combatant('tied-creature', 20),
        combatant('next', 19),
      ],
      true,
    )

    expect(items.map((item) =>
      item.kind === 'lair-action' ? item.kind : item.combatant.id,
    )).toEqual(['first', 'tied-pc', 'tied-creature', 'lair-action', 'next'])
  })

  it('places the lair action reminder before lower and unset initiatives', () => {
    const items = buildInitiativeOrder(
      [combatant('higher', 21), combatant('lower', 10), combatant('unset', null)],
      true,
    )

    expect(items.map((item) =>
      item.kind === 'lair-action' ? item.kind : item.combatant.id,
    )).toEqual(['higher', 'lair-action', 'lower', 'unset'])
  })

  it('does not add a reminder when the encounter has no lair actions', () => {
    const items = buildInitiativeOrder([combatant('one', 20)], false)

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'combatant', index: 0 })
  })
})
