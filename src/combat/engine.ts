import type { CombatantState, Encounter } from '../domain/types'

export function sortCombatants(combatants: CombatantState[]): CombatantState[] {
  return [...combatants].sort((first, second) => {
    if (first.initiative === null) return 1
    if (second.initiative === null) return -1
    return second.initiative - first.initiative
  })
}

export function startEncounter(encounter: Encounter): Encounter {
  const sortedCombatants = sortCombatants(encounter.combatants)
  const firstReadyIndex = sortedCombatants.findIndex(
    (combatant) => !combatant.isDefeated,
  )

  return {
    ...encounter,
    combatants: sortedCombatants,
    currentTurnIndex: Math.max(firstReadyIndex, 0),
    round: 1,
    isStarted: true,
  }
}

export function nextTurn(encounter: Encounter): Encounter {
  if (!encounter.isStarted || encounter.combatants.length === 0) {
    return encounter
  }

  const nextReadyIndex = findNextReadyIndex(
    encounter.combatants,
    encounter.currentTurnIndex,
  )
  const wrapped = nextReadyIndex <= encounter.currentTurnIndex

  return {
    ...encounter,
    currentTurnIndex: nextReadyIndex,
    round: wrapped ? encounter.round + 1 : encounter.round,
  }
}

export function updateCreatureHp(
  encounter: Encounter,
  combatantId: string,
  amount: number,
): Encounter {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) => {
      if (combatant.id !== combatantId || combatant.type !== 'creature') {
        return combatant
      }

      const currentHp = Math.min(
        Math.max((combatant.currentHp ?? 0) + amount, 0),
        combatant.maxHp ?? Number.MAX_SAFE_INTEGER,
      )

      return { ...combatant, currentHp, isDefeated: currentHp === 0 }
    }),
  }
}

function findNextReadyIndex(
  combatants: CombatantState[],
  currentIndex: number,
): number {
  for (let offset = 1; offset <= combatants.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % combatants.length
    if (!combatants[candidateIndex].isDefeated) return candidateIndex
  }

  return currentIndex
}