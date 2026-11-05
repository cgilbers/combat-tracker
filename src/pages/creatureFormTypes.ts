import type { AbilityScores } from '../domain/types'

export type CreatureForm = {
  name: string
  type: string
  size: string
  alignment: string
  ac: string
  hpAverage: string
  hpFormula: string
  speed: string
  abilities: Record<keyof AbilityScores, string>
  savingThrows: string
  skills: string
  senses: string
  languages: string
  challengeRating: string
  xp: string
  traits: string
  actions: string
  reactions: string
  legendaryActions: string
  lairActions: string
  spellcasting: string
  spellSlots: string
  legendaryActionLimit: string
  legendaryResistanceLimit: string
  hasLairActions: boolean
  tags: string
}
