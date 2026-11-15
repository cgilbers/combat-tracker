import type {
  BossResourceState,
  CombatantState,
  Creature,
  Encounter,
  EncounterCreatureGroup,
  LimitedUseResourceState,
  Party,
} from '../domain/types'

export type BossResourceKind =
  | 'spellSlots'
  | 'legendaryActions'
  | 'legendaryResistances'
export type ResourceAdjustment = 'spend' | 'restore'

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

    return Array.from({ length: group.quantity }, (_, index) => {
      const bossResourcesState = createBossResourceState(creature)
      return {
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
        ...(bossResourcesState ? { bossResourcesState } : {}),
      }
    })
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
      ? {
          ...encounter,
          status: 'active',
          combatants: encounter.combatants.map((combatant) =>
            initializeCombatantBossResources(combatant, encounter.creatureSnapshots),
          ),
          delayedCombatants: encounter.delayedCombatants?.map((combatant) =>
            initializeCombatantBossResources(combatant, encounter.creatureSnapshots),
          ),
        }
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

export function delayCombatant(encounter: Encounter, combatantId: string): Encounter {
  if (encounter.status !== 'active') {
    return encounter
  }

  const index = encounter.combatants.findIndex((combatant) => combatant.id === combatantId)
  if (index < 0) {
    throw new Error(`Combatant ${combatantId} was not found.`)
  }
  if (index !== encounter.currentTurnIndex) {
    throw new Error('Only the current combatant can delay their turn.')
  }

  const combatant = encounter.combatants[index]
  if (combatant.isDelayed) {
    return encounter
  }
  if (combatant.initiative === null) {
    throw new Error(`${combatant.name} has no active initiative to delay.`)
  }

  const delayedCombatant: CombatantState = {
    ...combatant,
    initiative: null,
    isDelayed: true,
    originalInitiative: combatant.initiative,
    delayRound: encounter.round,
  }

  const activeCombatants = encounter.combatants.filter((candidate) => candidate.id !== combatantId)
  const hasLaterReadyCombatant = activeCombatants
    .slice(index)
    .some((candidate) => !candidate.isDefeated)
  const wrapped = !hasLaterReadyCombatant
  const nextIndex = wrapped
    ? activeCombatants.findIndex((candidate) => !candidate.isDefeated)
    : activeCombatants.length === 0
      ? 0
      : findNextReadyIndex(activeCombatants, Math.min(index - 1, activeCombatants.length - 1))

  const updatedEncounter: Encounter = {
    ...encounter,
    combatants: wrapped
      ? activeCombatants.map((candidate) => ({
          ...candidate,
          originalInitiative: undefined,
          delayRound: undefined,
        }))
      : activeCombatants,
    delayedCombatants: [
      ...(encounter.delayedCombatants ?? []).map((candidate) =>
        wrapped ? { ...candidate, delayRound: undefined } : candidate,
      ),
      wrapped ? { ...delayedCombatant, delayRound: undefined } : delayedCombatant,
    ],
    currentTurnIndex: Math.max(nextIndex, 0),
    round: encounter.round + (wrapped ? 1 : 0),
  }
  return wrapped ? resetRoundScopedEncounter(updatedEncounter) : updatedEncounter
}

export const delayTurn = delayCombatant

export function resumeCombatant(
  encounter: Encounter,
  combatantId: string,
  afterCombatantId?: string,
): Encounter {
  if (encounter.status !== 'active') {
    return encounter
  }

  const delayedCombatants = encounter.delayedCombatants ?? []
  const delayedIndex = delayedCombatants.findIndex((combatant) => combatant.id === combatantId)
  if (delayedIndex < 0) {
    throw new Error(`Combatant ${combatantId} is not delayed.`)
  }

  const delayedCombatant = delayedCombatants[delayedIndex]
  const resumeNow = afterCombatantId === undefined
  const afterIndex = resumeNow
    ? encounter.currentTurnIndex - 1
    : encounter.combatants.findIndex((combatant) => combatant.id === afterCombatantId)

  if (!resumeNow && afterIndex < 0) {
    throw new Error(`Combatant ${afterCombatantId} was not found.`)
  }

  const insertIndex = resumeNow
    ? Math.max(0, encounter.currentTurnIndex)
    : afterIndex + 1
  const currentCombatant = encounter.combatants[encounter.currentTurnIndex]
  const previousCombatant = encounter.combatants[encounter.currentTurnIndex - 1]
  const resumedCombatant: CombatantState = {
    ...delayedCombatant,
    initiative: resumeNow
      ? previousCombatant?.initiative ??
        currentCombatant?.initiative ??
        delayedCombatant.originalInitiative ??
        delayedCombatant.initiative
      : encounter.combatants[afterIndex]?.initiative ??
        delayedCombatant.originalInitiative ??
        null,
    isDelayed: false,
    originalInitiative: undefined,
    delayRound: encounter.round,
  }

  const updatedCombatants = [...encounter.combatants]
  updatedCombatants.splice(insertIndex, 0, resumedCombatant)

  const nextCurrentTurnIndex = resumeNow
    ? insertIndex
    : encounter.currentTurnIndex + (insertIndex <= encounter.currentTurnIndex ? 1 : 0)

  return {
    ...encounter,
    combatants: updatedCombatants,
    delayedCombatants: delayedCombatants.filter((combatant) => combatant.id !== combatantId),
    currentTurnIndex: nextCurrentTurnIndex,
  }
}

export const resumeTurn = resumeCombatant

export function nextTurn(encounter: Encounter): Encounter {
  if (encounter.status !== 'active' || encounter.combatants.length === 0) {
    return encounter
  }

  const nextReadyIndex = findNextReadyIndex(
    encounter.combatants,
    encounter.currentTurnIndex,
  )
  const wrapped = nextReadyIndex <= encounter.currentTurnIndex

  if (!wrapped) {
    return { ...encounter, currentTurnIndex: nextReadyIndex }
  }

  return resetRoundScopedEncounter({
    ...encounter,
    combatants: encounter.combatants.map((combatant) => ({
      ...combatant,
      originalInitiative: undefined,
      delayRound: undefined,
    })),
    delayedCombatants: (encounter.delayedCombatants ?? []).map((combatant) => ({
      ...combatant,
      delayRound: undefined,
    })),
    currentTurnIndex: nextReadyIndex,
    round: encounter.round + 1,
  })
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

export function adjustBossResource(
  encounter: Encounter,
  combatantId: string,
  resource: BossResourceKind,
  direction: ResourceAdjustment,
  spellSlotLevel?: number,
): Encounter {
  if (encounter.status !== 'active') return encounter

  const combatant = [
    ...encounter.combatants,
    ...(encounter.delayedCombatants ?? []),
  ].find((candidate) => candidate.id === combatantId)
  if (!combatant) throw new Error(`Combatant ${combatantId} was not found.`)
  if (combatant.type !== 'creature') {
    throw new Error('Boss resources can only be adjusted for creatures.')
  }
  if (!combatant.bossResourcesState) {
    throw new Error(`${combatant.name} has no tracked boss resources.`)
  }

  const updateCombatant = (candidate: CombatantState): CombatantState => {
    if (candidate.id !== combatantId) return candidate

    const state = candidate.bossResourcesState
    if (!state) throw new Error(`${candidate.name} has no tracked boss resources.`)

    if (resource === 'spellSlots') {
      if (spellSlotLevel === undefined || !Number.isInteger(spellSlotLevel)) {
        throw new Error('A valid spell slot level is required.')
      }
      const current = state.spellSlots?.[spellSlotLevel]
      if (!current) throw new Error(`Spell slot level ${spellSlotLevel} is not defined.`)
      return {
        ...candidate,
        bossResourcesState: {
          ...state,
          spellSlots: {
            ...state.spellSlots,
            [spellSlotLevel]: adjustResourceCount(current, direction),
          },
        },
      }
    }

    const current = state[resource]
    if (!current) throw new Error(`${resource} is not defined for ${candidate.name}.`)
    const updated = adjustResourceCount(current, direction)
    const updatedState: BossResourceState =
      resource === 'legendaryActions'
        ? { ...state, legendaryActions: updated }
        : { ...state, legendaryResistances: updated }
    return { ...candidate, bossResourcesState: updatedState }
  }

  return {
    ...encounter,
    combatants: encounter.combatants.map(updateCombatant),
    delayedCombatants: encounter.delayedCombatants?.map(updateCombatant),
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

function createBossResourceState(
  creature: Creature,
): BossResourceState | undefined {
  const definition = creature.bossResources
  if (!definition) return undefined

  const spellSlots = Object.fromEntries(
    Object.entries(definition?.spellSlots ?? {}).map(([level, max]) => [
      Number(level),
      { max, used: 0 },
    ]),
  )
  const state: BossResourceState = {
    ...(Object.keys(spellSlots).length > 0 ? { spellSlots } : {}),
    ...(definition?.legendaryActions !== undefined
      ? { legendaryActions: { max: definition.legendaryActions, used: 0 } }
      : {}),
    ...(definition?.legendaryResistances !== undefined
      ? { legendaryResistances: { max: definition.legendaryResistances, used: 0 } }
      : {}),
  }

  return Object.keys(state).length > 0 ? state : undefined
}

function initializeCombatantBossResources(
  combatant: CombatantState,
  creatureSnapshots: Record<string, Creature>,
): CombatantState {
  if (combatant.type !== 'creature' || combatant.bossResourcesState) {
    return combatant
  }
  const creature = creatureSnapshots[combatant.refId]
  const state = creature ? createBossResourceState(creature) : undefined
  return state ? { ...combatant, bossResourcesState: state } : combatant
}

function adjustResourceCount(
  resource: LimitedUseResourceState,
  direction: ResourceAdjustment,
): LimitedUseResourceState {
  return {
    ...resource,
    used: Math.min(
      Math.max(resource.used + (direction === 'spend' ? 1 : -1), 0),
      resource.max,
    ),
  }
}

function resetRoundScopedResources(
  combatants: CombatantState[],
  delayedCombatants: CombatantState[] = [],
): { combatants: CombatantState[]; delayedCombatants: CombatantState[] } {
  const reset = (combatant: CombatantState): CombatantState => {
    const state = combatant.bossResourcesState
    if (!state) return combatant
    return {
      ...combatant,
      bossResourcesState: {
        ...state,
        ...(state.legendaryActions
          ? { legendaryActions: { ...state.legendaryActions, used: 0 } }
          : {}),
      },
    }
  }
  return {
    combatants: combatants.map(reset),
    delayedCombatants: delayedCombatants.map(reset),
  }
}

function resetRoundScopedEncounter(encounter: Encounter): Encounter {
  return {
    ...encounter,
    ...resetRoundScopedResources(
      encounter.combatants,
      encounter.delayedCombatants ?? [],
    ),
  }
}