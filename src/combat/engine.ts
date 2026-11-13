import type {
  CombatantState,
  Creature,
  Encounter,
  EncounterCreatureGroup,
  Party,
} from '../domain/types'

export function createDraftEncounter(id: string, name: string): Encounter {
  return {
    id,
    name: name.trim() || 'Unnamed encounter',
    status: 'draft',
    creatureGroups: [],
    creatureSnapshots: {},
    combatants: [],
    round: 1,
    currentTurnIndex: 0,
  }
}

export function addCreatureGroup(
  encounter: Encounter,
  creature: Creature,
  quantity: number,
  createId: () => string,
): Encounter {
  if (encounter.status !== 'draft') throw new Error('Only draft encounters can be edited.')

  const count = Math.min(Math.max(Math.floor(quantity) || 1, 1), 12)
  const snapshot = encounter.creatureSnapshots[creature.id] ?? structuredClone(creature)
  const group: EncounterCreatureGroup = {
    id: createId(),
    creatureId: creature.id,
    quantity: count,
    initiative: null,
  }

  return {
    ...encounter,
    creatureGroups: [...encounter.creatureGroups, group],
    creatureSnapshots: {
      ...encounter.creatureSnapshots,
      [creature.id]: snapshot,
    },
  }
}

export function updateCreatureGroup(
  encounter: Encounter,
  groupId: string,
  update: Partial<Pick<EncounterCreatureGroup, 'quantity' | 'initiative'>>,
): Encounter {
  if (encounter.status !== 'draft') throw new Error('Only draft encounters can be edited.')

  return {
    ...encounter,
    creatureGroups: encounter.creatureGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            ...(update.quantity !== undefined
              ? { quantity: Math.min(Math.max(Math.floor(update.quantity) || 1, 1), 12) }
              : {}),
            ...(update.initiative !== undefined ? { initiative: update.initiative } : {}),
          }
        : group,
    ),
  }
}

export function rollCreatureGroupInitiative(
  encounter: Encounter,
  groupId: string,
  rollD20: () => number = () => Math.floor(Math.random() * 20) + 1,
): Encounter {
  if (encounter.status !== 'draft') throw new Error('Only draft encounters can be edited.')

  const group = encounter.creatureGroups.find((candidate) => candidate.id === groupId)
  if (!group) throw new Error(`Creature group ${groupId} was not found.`)

  const creature = encounter.creatureSnapshots[group.creatureId]
  if (!creature) throw new Error(`Creature data is missing for ${group.creatureId}.`)
  if (!Number.isFinite(creature.dexterityModifier)) {
    throw new Error(`Dexterity modifier is invalid for ${creature.name}.`)
  }

  const dieResult = rollD20()
  if (!Number.isInteger(dieResult) || dieResult < 1 || dieResult > 20) {
    throw new Error('A d20 roll must be an integer from 1 to 20.')
  }

  return updateCreatureGroup(encounter, groupId, {
    initiative: dieResult + creature.dexterityModifier,
  })
}

export function rollAllCreatureGroupInitiatives(
  encounter: Encounter,
  rollD20?: () => number,
): Encounter {
  return encounter.creatureGroups.reduce(
    (updatedEncounter, group) =>
      rollCreatureGroupInitiative(updatedEncounter, group.id, rollD20),
    encounter,
  )
}

export function removeCreatureGroup(encounter: Encounter, groupId: string): Encounter {
  if (encounter.status !== 'draft') throw new Error('Only draft encounters can be edited.')
  return {
    ...encounter,
    creatureGroups: encounter.creatureGroups.filter((group) => group.id !== groupId),
  }
}

export function sortCombatants(combatants: CombatantState[]): CombatantState[] {
  return combatants
    .map((combatant, index) => ({ combatant, index }))
    .sort((first, second) => {
      if (
        first.combatant.initiative === null &&
        second.combatant.initiative === null
      ) {
        return first.index - second.index
      }
      if (first.combatant.initiative === null) return 1
      if (second.combatant.initiative === null) return -1

      const typeOrder =
        first.combatant.type === second.combatant.type
          ? 0
          : first.combatant.type === 'pc'
            ? -1
            : 1
      return (
        second.combatant.initiative - first.combatant.initiative ||
        typeOrder ||
        first.index - second.index
      )
    })
    .map(({ combatant }) => combatant)
}

export function startEncounter(
  encounter: Encounter,
  party: Party,
  pcInitiatives: Record<string, number>,
  createId: () => string,
): Encounter {
  if (encounter.status !== 'draft') {
    throw new Error('Only draft encounters can be started.')
  }
  if (encounter.creatureGroups.length === 0) {
    throw new Error('Add at least one creature group before starting.')
  }
  if (party.members.length === 0) {
    throw new Error('Choose a party with at least one player character before starting.')
  }

  const characterWithoutInitiative = party.members.find(
    (member) => !Number.isFinite(pcInitiatives[member.id]),
  )
  if (characterWithoutInitiative) {
    throw new Error(`Initiative is required for ${characterWithoutInitiative.name}.`)
  }
  const groupWithoutInitiative = encounter.creatureGroups.find(
    (group) => !Number.isFinite(group.initiative),
  )
  if (groupWithoutInitiative) {
    const creatureName =
      encounter.creatureSnapshots[groupWithoutInitiative.creatureId]?.name ?? 'Creature group'
    throw new Error(`Initiative is required for ${creatureName}.`)
  }

  const pcCombatants: CombatantState[] = party.members.map((member) => ({
    id: createId(),
    type: 'pc',
    refId: member.id,
    name: member.name,
    initiative: pcInitiatives[member.id] ?? null,
  }))
  const creatureCombatants = encounter.creatureGroups.flatMap((group) => {
    const creature = encounter.creatureSnapshots[group.creatureId]
    if (!creature) throw new Error(`Creature data is missing for ${group.creatureId}.`)
    const siblingGroups = encounter.creatureGroups.filter(
      (candidate) => candidate.creatureId === group.creatureId,
    )
    const groupNumber = siblingGroups.findIndex((candidate) => candidate.id === group.id) + 1
    const useGroupNumber = siblingGroups.length > 1

    return Array.from({ length: group.quantity }, (_, index) => ({
      id: createId(),
      type: 'creature' as const,
      refId: group.creatureId,
      groupId: group.id,
      name: `${creature.name}${useGroupNumber ? ` (Group ${groupNumber})` : ''}${
        group.quantity > 1 ? ` ${index + 1}` : ''
      }`,
      initiative: group.initiative,
      currentHp: creature.hpAverage,
      maxHp: creature.hpAverage,
      ac: creature.ac,
    }))
  })
  const sortedCombatants = sortCombatants([
    ...creatureCombatants,
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
    status: 'active',
  }
}

export function pauseEncounter(encounter: Encounter): Encounter {
  return encounter.status === 'active' ? { ...encounter, status: 'paused' } : encounter
}

export function activateEncounter(encounters: Encounter[], encounterId: string): Encounter[] {
  const selected = encounters.find((encounter) => encounter.id === encounterId)
  if (!selected || (selected.status !== 'paused' && selected.status !== 'active')) {
    throw new Error('Only paused encounters can be resumed.')
  }
  return encounters.map((encounter) =>
    encounter.id === encounterId
      ? { ...encounter, status: 'active' }
      : encounter.status === 'active'
        ? { ...encounter, status: 'paused' }
        : encounter,
  )
}

export function completeEncounter(encounter: Encounter): Encounter {
  if (encounter.status !== 'active' && encounter.status !== 'paused') {
    throw new Error('Only active or paused encounters can be completed.')
  }
  return { ...encounter, status: 'complete' }
}

export function duplicateEncounter(
  encounter: Encounter,
  createId: () => string,
): Encounter {
  return {
    ...encounter,
    id: createId(),
    status: 'draft',
    partyId: undefined,
    creatureGroups: encounter.creatureGroups.map((group) => ({
      ...group,
      id: createId(),
      initiative: null,
    })),
    creatureSnapshots: structuredClone(encounter.creatureSnapshots),
    combatants: [],
    round: 1,
    currentTurnIndex: 0,
  }
}

export function nextTurn(encounter: Encounter): Encounter {
  if (encounter.status !== 'active' || encounter.combatants.length === 0) {
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