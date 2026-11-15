import type { CombatantState } from '../domain/types'

export type InitiativeOrderItem =
  | { kind: 'combatant'; combatant: CombatantState; index: number }
  | { kind: 'lair-action' }

export function buildInitiativeOrder(
  combatants: CombatantState[],
  hasLairActions: boolean,
): InitiativeOrderItem[] {
  const items: InitiativeOrderItem[] = combatants.map((combatant, index) => ({
    kind: 'combatant',
    combatant,
    index,
  }))
  if (!hasLairActions) return items

  const reminderIndex = items.findIndex(
    (item) =>
      item.kind === 'combatant' &&
      (item.combatant.initiative === null || item.combatant.initiative < 20),
  )
  items.splice(
    reminderIndex < 0 ? items.length : reminderIndex,
    0,
    { kind: 'lair-action' },
  )
  return items
}
