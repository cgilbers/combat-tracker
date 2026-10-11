import { useState } from 'react'
import {
  formatNamedEntries,
  formatNumericEntries,
  parseNamedEntries,
  parseNumericEntries,
  validateCreature,
} from '../domain/creature'
import type { AbilityScores, Creature } from '../domain/types'

type CreatureForm = {
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

type CreatureLibraryProps = {
  creatures: Creature[]
  selectedCreatureId: string
  onSelectCreature: (creatureId: string) => void
  onSaveCreature: (creature: Creature) => Promise<void>
  onDeleteCreature: (creatureId: string) => Promise<void>
}

const emptyAbilities: Record<keyof AbilityScores, string> = {
  str: '10',
  dex: '10',
  con: '10',
  int: '10',
  wis: '10',
  cha: '10',
}
const abilityKeys: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const emptyForm: CreatureForm = {
  name: '',
  type: '',
  size: '',
  alignment: '',
  ac: '10',
  hpAverage: '1',
  hpFormula: '',
  speed: '',
  abilities: emptyAbilities,
  savingThrows: '',
  skills: '',
  senses: '',
  languages: '',
  challengeRating: '',
  xp: '',
  traits: '',
  actions: '',
  reactions: '',
  legendaryActions: '',
  lairActions: '',
  spellcasting: '',
  spellSlots: '',
  legendaryActionLimit: '',
  legendaryResistanceLimit: '',
  hasLairActions: false,
  tags: '',
}

function formFromCreature(creature: Creature): CreatureForm {
  return {
    name: creature.name,
    type: creature.type ?? '',
    size: creature.size ?? '',
    alignment: creature.alignment ?? '',
    ac: String(creature.ac),
    hpAverage: String(creature.hpAverage),
    hpFormula: creature.hpFormula ?? '',
    speed: creature.speed ?? '',
    abilities: {
      str: String(creature.abilities?.str ?? 10),
      dex: String(
        creature.abilities?.dex ??
          Math.max(1, 10 + creature.dexterityModifier * 2),
      ),
      con: String(creature.abilities?.con ?? 10),
      int: String(creature.abilities?.int ?? 10),
      wis: String(creature.abilities?.wis ?? 10),
      cha: String(creature.abilities?.cha ?? 10),
    },
    savingThrows: formatNumericEntries(creature.savingThrows),
    skills: formatNumericEntries(creature.skills),
    senses: creature.senses ?? '',
    languages: creature.languages ?? '',
    challengeRating:
      creature.challengeRating === undefined ? '' : String(creature.challengeRating),
    xp: creature.xp === undefined ? '' : String(creature.xp),
    traits: formatNamedEntries(creature.traits),
    actions: formatNamedEntries(creature.actions),
    reactions: formatNamedEntries(creature.reactions),
    legendaryActions: formatNamedEntries(creature.legendaryActions),
    lairActions: formatNamedEntries(creature.lairActions),
    spellcasting: creature.spellcasting ?? '',
    spellSlots: formatNumericEntries(creature.bossResources?.spellSlots),
    legendaryActionLimit:
      creature.bossResources?.legendaryActions === undefined
        ? ''
        : String(creature.bossResources.legendaryActions),
    legendaryResistanceLimit:
      creature.bossResources?.legendaryResistances === undefined
        ? ''
        : String(creature.bossResources.legendaryResistances),
    hasLairActions: creature.bossResources?.hasLairActions ?? false,
    tags: creature.tags?.join(', ') ?? '',
  }
}

function optionalText(value: string): string | undefined {
  return value.trim() || undefined
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value)
}

function optionalPositiveCount(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value)
}

export function CreatureLibrary({
  creatures,
  selectedCreatureId,
  onSelectCreature,
  onSaveCreature,
  onDeleteCreature,
}: CreatureLibraryProps) {
  const [editingCreatureId, setEditingCreatureId] = useState('')
  const [form, setForm] = useState<CreatureForm>(emptyForm)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [operationError, setOperationError] = useState('')
  const editingCreature = creatures.find((creature) => creature.id === editingCreatureId)

  const beginEditing = (creature: Creature) => {
    setEditingCreatureId(creature.id)
    onSelectCreature(creature.id)
    setForm(formFromCreature(creature))
    setValidationErrors([])
  }

  const beginCreating = () => {
    setEditingCreatureId('')
    onSelectCreature('')
    setForm(emptyForm)
    setValidationErrors([])
    setOperationError('')
  }

  const updateForm = <K extends keyof CreatureForm>(key: K, value: CreatureForm[K]) => {
    setForm((currentForm) => ({ ...currentForm, [key]: value }))
  }

  const buildCreature = (): Creature => {
    const spellSlots = parseNumericEntries(form.spellSlots)
    const bossResources =
      spellSlots ||
      optionalPositiveCount(form.legendaryActionLimit) !== undefined ||
      optionalPositiveCount(form.legendaryResistanceLimit) !== undefined ||
      form.hasLairActions
        ? {
            ...(spellSlots ? { spellSlots: Object.fromEntries(
              Object.entries(spellSlots).map(([level, max]) => [Number(level), max]),
            ) } : {}),
            ...(form.legendaryActionLimit.trim()
              ? { legendaryActions: Number(form.legendaryActionLimit) }
              : {}),
            ...(form.legendaryResistanceLimit.trim()
              ? { legendaryResistances: Number(form.legendaryResistanceLimit) }
              : {}),
            ...(form.hasLairActions ? { hasLairActions: true } : {}),
          }
        : undefined

    return {
      id: editingCreatureId || crypto.randomUUID(),
      source: editingCreature?.source ?? 'custom',
      name: form.name.trim(),
      type: optionalText(form.type),
      size: optionalText(form.size),
      alignment: optionalText(form.alignment),
      ac: Number(form.ac),
      hpAverage: Number(form.hpAverage),
      hpFormula: optionalText(form.hpFormula),
      speed: optionalText(form.speed),
      dexterityModifier: Math.floor((Number(form.abilities.dex) - 10) / 2),
      abilities: {
        str: Number(form.abilities.str),
        dex: Number(form.abilities.dex),
        con: Number(form.abilities.con),
        int: Number(form.abilities.int),
        wis: Number(form.abilities.wis),
        cha: Number(form.abilities.cha),
      },
      savingThrows: parseNumericEntries(form.savingThrows),
      skills: parseNumericEntries(form.skills),
      senses: optionalText(form.senses),
      languages: optionalText(form.languages),
      challengeRating: optionalNumber(form.challengeRating),
      xp: optionalNumber(form.xp),
      traits: parseNamedEntries(form.traits),
      actions: parseNamedEntries(form.actions),
      reactions: parseNamedEntries(form.reactions),
      legendaryActions: parseNamedEntries(form.legendaryActions),
      lairActions: parseNamedEntries(form.lairActions),
      spellcasting: optionalText(form.spellcasting),
      bossResources,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
  }

  const save = async () => {
    const creature = buildCreature()
    const errors = validateCreature(creature)
    setValidationErrors(errors)
    if (errors.length) return

    setIsSaving(true)
    try {
      await onSaveCreature(creature)
      setEditingCreatureId(creature.id)
      setForm(formFromCreature(creature))
      onSelectCreature(creature.id)
      setOperationError('')
    } catch {
      setOperationError('Creature could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (!editingCreature) return
    try {
      await onDeleteCreature(editingCreature.id)
      beginCreating()
    } catch {
      setOperationError('Creature could not be deleted. Please try again.')
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="step-label">02 / CREATURE</span>
          <h2>Creature library</h2>
        </div>
        <span className="count-pill">{creatures.length} saved</span>
      </div>
      <div className="creature-library-actions">
        <label>
          Select creature
          <select
            aria-label="Select creature to edit or use"
            value={selectedCreatureId}
            onChange={(event) => {
              const creature = creatures.find((item) => item.id === event.target.value)
              if (creature) beginEditing(creature)
              else onSelectCreature('')
            }}
          >
            <option value="">No creature selected</option>
            {creatures.map((creature) => (
              <option value={creature.id} key={creature.id}>
                {creature.name} · {creature.source.toUpperCase()} · AC {creature.ac} · {creature.hpAverage} HP
              </option>
            ))}
          </select>
        </label>
        <button className="backup-button" type="button" onClick={beginCreating}>
          New creature
        </button>
      </div>
      <p className="section-note">
        {editingCreature ? `Editing ${editingCreature.source.toUpperCase()} creature` : 'Creating a custom creature'}
      </p>
      <div className="creature-form-grid">
        <label className="wide-field">
          Name
          <input aria-label="Creature name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
        </label>
        <label>
          Type
          <input value={form.type} onChange={(event) => updateForm('type', event.target.value)} />
        </label>
        <label>
          Size
          <input value={form.size} onChange={(event) => updateForm('size', event.target.value)} />
        </label>
        <label>
          Alignment
          <input value={form.alignment} onChange={(event) => updateForm('alignment', event.target.value)} />
        </label>
        <label>
          AC
          <input aria-label="Creature AC" type="number" min="1" value={form.ac} onChange={(event) => updateForm('ac', event.target.value)} />
        </label>
        <label>
          Average HP
          <input aria-label="Creature average HP" type="number" min="1" value={form.hpAverage} onChange={(event) => updateForm('hpAverage', event.target.value)} />
        </label>
        <label>
          HP formula
          <input placeholder="4d8 + 4" value={form.hpFormula} onChange={(event) => updateForm('hpFormula', event.target.value)} />
        </label>
        <label>
          Speed
          <input placeholder="30 ft., fly 60 ft." value={form.speed} onChange={(event) => updateForm('speed', event.target.value)} />
        </label>
      </div>

      <fieldset className="creature-fieldset">
        <legend>Ability scores</legend>
        <div className="ability-score-grid">
          {abilityKeys.map((ability) => (
            <label key={ability}>
              {ability.toUpperCase()}
              <input
                aria-label={`${ability.toUpperCase()} ability score`}
                type="number"
                min="1"
                value={form.abilities[ability]}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    abilities: {
                      ...currentForm.abilities,
                      [ability]: event.target.value,
                    },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="creature-form-grid">
        <label>
          Saving throws
          <textarea aria-label="Creature saving throws" placeholder={'Dex: 3\nCon: 2'} value={form.savingThrows} onChange={(event) => updateForm('savingThrows', event.target.value)} />
        </label>
        <label>
          Skills
          <textarea aria-label="Creature skills" placeholder={'Perception: 4\nStealth: 3'} value={form.skills} onChange={(event) => updateForm('skills', event.target.value)} />
        </label>
        <label>
          Senses
          <input value={form.senses} onChange={(event) => updateForm('senses', event.target.value)} />
        </label>
        <label>
          Languages
          <input value={form.languages} onChange={(event) => updateForm('languages', event.target.value)} />
        </label>
        <label>
          Challenge rating
          <input aria-label="Creature challenge rating" type="number" min="0" step="any" value={form.challengeRating} onChange={(event) => updateForm('challengeRating', event.target.value)} />
        </label>
        <label>
          XP
          <input aria-label="Creature XP" type="number" min="0" step="1" value={form.xp} onChange={(event) => updateForm('xp', event.target.value)} />
        </label>
        <label className="wide-field">
          Traits
          <textarea aria-label="Creature traits" placeholder="Name: Description (one per line)" value={form.traits} onChange={(event) => updateForm('traits', event.target.value)} />
        </label>
        <label className="wide-field">
          Actions
          <textarea aria-label="Creature actions" placeholder="Name: Description (one per line)" value={form.actions} onChange={(event) => updateForm('actions', event.target.value)} />
        </label>
        <label className="wide-field">
          Reactions
          <textarea aria-label="Creature reactions" placeholder="Name: Description (one per line)" value={form.reactions} onChange={(event) => updateForm('reactions', event.target.value)} />
        </label>
        <label className="wide-field">
          Legendary actions
          <textarea aria-label="Creature legendary actions" placeholder="Name: Description (one per line)" value={form.legendaryActions} onChange={(event) => updateForm('legendaryActions', event.target.value)} />
        </label>
        <label className="wide-field">
          Lair actions
          <textarea aria-label="Creature lair actions" placeholder="Name: Description (one per line)" value={form.lairActions} onChange={(event) => updateForm('lairActions', event.target.value)} />
        </label>
        <label className="wide-field">
          Spellcasting
          <textarea aria-label="Creature spellcasting" value={form.spellcasting} onChange={(event) => updateForm('spellcasting', event.target.value)} />
        </label>
      </div>

      <fieldset className="creature-fieldset">
        <legend>Boss resource limits</legend>
        <div className="creature-form-grid">
          <label>
            Spell slots by level
            <textarea aria-label="Spell slot limits" placeholder={'1: 4\n2: 3'} value={form.spellSlots} onChange={(event) => updateForm('spellSlots', event.target.value)} />
          </label>
          <label>
            Legendary action limit
            <input aria-label="Legendary action limit" type="number" min="0" step="1" value={form.legendaryActionLimit} onChange={(event) => updateForm('legendaryActionLimit', event.target.value)} />
          </label>
          <label>
            Legendary resistance limit
            <input aria-label="Legendary resistance limit" type="number" min="0" step="1" value={form.legendaryResistanceLimit} onChange={(event) => updateForm('legendaryResistanceLimit', event.target.value)} />
          </label>
          <label className="checkbox-field">
            Has lair actions
            <input type="checkbox" checked={form.hasLairActions} onChange={(event) => updateForm('hasLairActions', event.target.checked)} />
          </label>
        </div>
      </fieldset>

      <label className="creature-tags">
        Tags
        <input placeholder="goblin, boss, undead" value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} />
      </label>
      {validationErrors.length > 0 && (
        <ul className="validation-errors" role="alert">
          {validationErrors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {operationError && <p className="warning-copy" role="alert">{operationError}</p>}
      <div className="creature-form-actions">
        <button className="text-button" type="button" onClick={save} disabled={isSaving}>
          {editingCreature ? 'Save creature changes' : 'Save creature'}
        </button>
        {editingCreature && (
          <button className="text-button delete-creature-button" type="button" onClick={remove}>
            Delete creature
          </button>
        )}
      </div>
    </section>
  )
}
