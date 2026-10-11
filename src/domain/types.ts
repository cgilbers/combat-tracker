export type CombatantType = 'pc' | 'creature'

export type Character = {
  id: string
  name: string
  notes?: string
}

export type Party = {
  id: string
  name: string
  members: Character[]
}

export type Creature = {
  id: string
  source: 'custom'
  name: string
  ac: number
  hpAverage: number
  hpFormula?: string
  dexterityModifier: number
  type?: string
  speed?: string
  traits?: CreatureAction[]
  actions?: CreatureAction[]
}

export type CreatureAction = {
  name: string
  description: string
}

export type CombatantState = {
  id: string
  type: CombatantType
  refId: string
  name: string
  initiative: number | null
  currentHp?: number
  maxHp?: number
  ac?: number
  isDefeated?: boolean
}

export type Encounter = {
  id: string
  name: string
  partyId?: string
  combatants: CombatantState[]
  round: number
  currentTurnIndex: number
  isStarted: boolean
}