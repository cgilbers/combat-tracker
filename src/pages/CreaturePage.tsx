import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, SelectInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { SectionHeading } from '../components/SectionHeading'
import {
  formatNamedEntries,
  formatNumericEntries,
  parseNamedEntries,
  parseNumericEntries,
  validateCreature,
} from '../domain/creature'
import { SrdCreatureImporter } from '../creatures/SrdCreatureImporter'
import type { AbilityScores, Creature } from '../domain/types'
import { CreatureFormFields } from './CreatureFormFields'
import type { CreatureForm } from './creatureFormTypes'

type CreaturePageProps = {
  creatures: Creature[]
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

export function CreaturePage({
  creatures,
  onSaveCreature,
  onDeleteCreature,
}: CreaturePageProps) {
  const [selectedCreatureId, setSelectedCreatureId] = useState('')
  const [editingCreatureId, setEditingCreatureId] = useState('')
  const [form, setForm] = useState<CreatureForm>(emptyForm)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [operationError, setOperationError] = useState('')
  const editingCreature = creatures.find((creature) => creature.id === editingCreatureId)

  const beginEditing = (creature: Creature) => {
    setEditingCreatureId(creature.id)
    setSelectedCreatureId(creature.id)
    setForm(formFromCreature(creature))
    setValidationErrors([])
  }

  const beginCreating = () => {
    setEditingCreatureId('')
    setSelectedCreatureId('')
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
      setSelectedCreatureId(creature.id)
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
    <Panel variant="builder">
      <SectionHeading step="CREATURE" title="Creature library" count={`${creatures.length} saved`} />
      <div className="mb-4 flex items-end gap-3">
        <FieldLabel className="min-w-0 flex-1">
          Select creature
          <SelectInput
            aria-label="Select creature to edit or use"
            value={selectedCreatureId}
            onChange={(event) => {
              const creature = creatures.find((item) => item.id === event.target.value)
              if (creature) beginEditing(creature)
              else setSelectedCreatureId('')
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
      <CreatureFormFields
        form={form}
        onUpdateField={updateForm}
        onUpdateAbility={(ability, value) =>
          setForm((currentForm) => ({
            ...currentForm,
            abilities: { ...currentForm.abilities, [ability]: value },
          }))
        }
      />
      {validationErrors.length > 0 && (
        <ul className="mb-4 list-inside list-disc border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {validationErrors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {operationError && <p className="mb-4 text-sm text-danger" role="alert">{operationError}</p>}
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
