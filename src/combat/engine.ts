import type { CombatantState, Encounter, Party } from '../domain/types'

export function sortCombatants(combatants: CombatantState[]): CombatantState[] {
  return [...combatants].sort((first, second) => {
    if (first.initiative === null) return 1
    if (second.initiative === null) return -1
    return second.initiative - first.initiative
  })
}

export function startEncounter(
  encounter: Encounter,
  party: Party,
  pcInitiatives: Record<string, number>,
  createId: () => string,
): Encounter {
  const characterWithoutInitiative = party.members.find(
    (member) => !Number.isFinite(pcInitiatives[member.id]),
  )
  if (characterWithoutInitiative) {
    throw new Error(`Initiative is required for ${characterWithoutInitiative.name}.`)
  }

  const pcCombatants: CombatantState[] = party.members.map((member) => ({
    id: createId(),
    type: 'pc',
    refId: member.id,
    name: member.name,
    initiative: pcInitiatives[member.id] ?? null,
  }))
  const sortedCombatants = sortCombatants([
    ...encounter.combatants.filter((combatant) => combatant.type !== 'pc'),
    ...pcCombatants,
  ])
  const firstReadyIndex = sortedCombatants.findIndex(
    (combatant) => !combatant.isDefeated,
  )

  return {
    ...encounter,
    partyId: party.id,
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