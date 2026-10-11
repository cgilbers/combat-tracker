import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, SelectInput, TextArea, TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { SectionHeading } from '../components/SectionHeading'
import {
  formatNamedEntries,
  formatNumericEntries,
  parseNamedEntries,
  parseNumericEntries,
  validateCreature,
} from '../domain/creature'
import { SrdCreatureImporter } from './SrdCreatureImporter'
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
    <Panel>
      <SectionHeading step="02 / CREATURE" title="Creature library" count={`${creatures.length} saved`} />
      <div className="mb-4 flex items-end gap-3">
        <FieldLabel className="min-w-0 flex-1">
          Select creature
          <SelectInput
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
          </SelectInput>
        </FieldLabel>
        <Button className="shrink-0" onClick={beginCreating}>
          New creature
        </Button>
      </div>
      <SrdCreatureImporter creatures={creatures} onImportCreature={onSaveCreature} />
      <p className="mb-4 mt-5 border-t border-line pt-4 font-mono text-[10px] tracking-[.3px] text-muted">
        {editingCreature ? `Editing ${editingCreature.source.toUpperCase()} creature` : 'Creating a custom creature'}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FieldLabel className="col-span-full">
          Name
          <TextInput aria-label="Creature name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Type
          <TextInput value={form.type} onChange={(event) => updateForm('type', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Size
          <TextInput value={form.size} onChange={(event) => updateForm('size', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Alignment
          <TextInput value={form.alignment} onChange={(event) => updateForm('alignment', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          AC
          <TextInput aria-label="Creature AC" type="number" min="1" value={form.ac} onChange={(event) => updateForm('ac', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Average HP
          <TextInput aria-label="Creature average HP" type="number" min="1" value={form.hpAverage} onChange={(event) => updateForm('hpAverage', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          HP formula
          <TextInput placeholder="4d8 + 4" value={form.hpFormula} onChange={(event) => updateForm('hpFormula', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Speed
          <TextInput placeholder="30 ft., fly 60 ft." value={form.speed} onChange={(event) => updateForm('speed', event.target.value)} />
        </FieldLabel>
      </div>

      <fieldset className="my-5 border border-line p-4">
        <legend className="px-2 font-mono text-[10px] tracking-[.5px] text-lime">Ability scores</legend>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {abilityKeys.map((ability) => (
            <FieldLabel className="min-w-0" key={ability}>
              {ability.toUpperCase()}
              <TextInput
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
            </FieldLabel>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FieldLabel>
          Saving throws
          <TextArea aria-label="Creature saving throws" placeholder={'Dex: 3\nCon: 2'} value={form.savingThrows} onChange={(event) => updateForm('savingThrows', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Skills
          <TextArea aria-label="Creature skills" placeholder={'Perception: 4\nStealth: 3'} value={form.skills} onChange={(event) => updateForm('skills', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Senses
          <TextInput value={form.senses} onChange={(event) => updateForm('senses', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Languages
          <TextInput value={form.languages} onChange={(event) => updateForm('languages', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Challenge rating
          <TextInput aria-label="Creature challenge rating" type="number" min="0" step="any" value={form.challengeRating} onChange={(event) => updateForm('challengeRating', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          XP
          <TextInput aria-label="Creature XP" type="number" min="0" step="1" value={form.xp} onChange={(event) => updateForm('xp', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Traits
          <TextArea aria-label="Creature traits" placeholder="Name: Description (one per line)" value={form.traits} onChange={(event) => updateForm('traits', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Actions
          <TextArea aria-label="Creature actions" placeholder="Name: Description (one per line)" value={form.actions} onChange={(event) => updateForm('actions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Reactions
          <TextArea aria-label="Creature reactions" placeholder="Name: Description (one per line)" value={form.reactions} onChange={(event) => updateForm('reactions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Legendary actions
          <TextArea aria-label="Creature legendary actions" placeholder="Name: Description (one per line)" value={form.legendaryActions} onChange={(event) => updateForm('legendaryActions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Lair actions
          <TextArea aria-label="Creature lair actions" placeholder="Name: Description (one per line)" value={form.lairActions} onChange={(event) => updateForm('lairActions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Spellcasting
          <TextArea aria-label="Creature spellcasting" value={form.spellcasting} onChange={(event) => updateForm('spellcasting', event.target.value)} />
        </FieldLabel>
      </div>

      <fieldset className="my-5 border border-line p-4">
        <legend className="px-2 font-mono text-[10px] tracking-[.5px] text-lime">Boss resource limits</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FieldLabel>
            Spell slots by level
            <TextArea aria-label="Spell slot limits" placeholder={'1: 4\n2: 3'} value={form.spellSlots} onChange={(event) => updateForm('spellSlots', event.target.value)} />
          </FieldLabel>
          <FieldLabel>
            Legendary action limit
            <TextInput aria-label="Legendary action limit" type="number" min="0" step="1" value={form.legendaryActionLimit} onChange={(event) => updateForm('legendaryActionLimit', event.target.value)} />
          </FieldLabel>
          <FieldLabel>
            Legendary resistance limit
            <TextInput aria-label="Legendary resistance limit" type="number" min="0" step="1" value={form.legendaryResistanceLimit} onChange={(event) => updateForm('legendaryResistanceLimit', event.target.value)} />
          </FieldLabel>
          <label className="flex flex-row items-center justify-between gap-2 self-end border border-line bg-[#161a18] px-3 py-3 font-mono text-[10px] tracking-[.3px] text-muted uppercase">
            Has lair actions
            <input className="size-4 accent-lime" type="checkbox" checked={form.hasLairActions} onChange={(event) => updateForm('hasLairActions', event.target.checked)} />
          </label>
        </div>
      </fieldset>

      <FieldLabel className="mb-4">
        Tags
        <TextInput placeholder="goblin, boss, undead" value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} />
      </FieldLabel>
      {validationErrors.length > 0 && (
        <ul className="mb-4 list-inside list-disc border border-orange/40 bg-orange/10 p-3 text-sm text-orange" role="alert">
          {validationErrors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {operationError && <p className="mb-4 text-sm text-orange" role="alert">{operationError}</p>}
      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <Button variant="primary" onClick={save} disabled={isSaving}>
          {editingCreature ? 'Save creature changes' : 'Save creature'}
        </Button>
        {editingCreature && (
          <Button variant="danger" onClick={remove}>
            Delete creature
          </Button>
        )}
      </div>
    </Panel>
  )
}
