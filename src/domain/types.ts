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
  source: 'custom' | 'srd'
  name: string
  ac: number
  hpAverage: number
  hpFormula?: string
  dexterityModifier: number
  type?: string
  size?: string
  alignment?: string
  speed?: string
  abilities?: AbilityScores
  savingThrows?: Record<string, number>
  skills?: Record<string, number>
  senses?: string
  languages?: string
  challengeRating?: number
  xp?: number
  traits?: CreatureAction[]
  actions?: CreatureAction[]
  reactions?: CreatureAction[]
  legendaryActions?: CreatureAction[]
  lairActions?: CreatureAction[]
  spellcasting?: string
  bossResources?: BossResourceDefinition
  tags?: string[]
}

export type AbilityScores = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type CreatureAction = {
  name: string
  description: string
}

export type BossResourceDefinition = {
  spellSlots?: Record<number, number>
  legendaryActions?: number
  legendaryResistances?: number
  hasLairActions?: boolean
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