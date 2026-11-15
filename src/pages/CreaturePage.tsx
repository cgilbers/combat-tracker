import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, TextInput } from '../components/FormControls'
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
  spellDescriptions: '',
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
    spellDescriptions: formatNamedEntries(creature.spellDescriptions),
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
  const [creatureSearch, setCreatureSearch] = useState('')
  const [isCreatureSearchOpen, setIsCreatureSearchOpen] = useState(false)
  const [activeCreatureIndex, setActiveCreatureIndex] = useState(-1)
  const [editingCreatureId, setEditingCreatureId] = useState('')
  const [form, setForm] = useState<CreatureForm>(emptyForm)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [operationError, setOperationError] = useState('')
  const editingCreature = creatures.find((creature) => creature.id === editingCreatureId)
  const filteredCreatures = creatures.filter((creature) =>
    `${creature.name} ${creature.source} ${creature.type ?? ''} ${creature.ac} ${creature.hpAverage}`
      .toLowerCase()
      .includes(creatureSearch.trim().toLowerCase()),
  )

  const beginEditing = (creature: Creature) => {
    setEditingCreatureId(creature.id)
    setSelectedCreatureId(creature.id)
    setCreatureSearch(creature.name)
    setIsCreatureSearchOpen(false)
    setForm(formFromCreature(creature))
    setValidationErrors([])
  }

  const beginCreating = () => {
    setEditingCreatureId('')
    setSelectedCreatureId('')
    setCreatureSearch('')
    setIsCreatureSearchOpen(false)
    setForm(emptyForm)
    setValidationErrors([])
    setOperationError('')
  }

  const selectCreatureAt = (index: number) => {
    const creature = filteredCreatures[index]
    if (creature) beginEditing(creature)
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
      spellDescriptions: parseNamedEntries(form.spellDescriptions),
      srdSpells: editingCreature?.srdSpells,
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
      setCreatureSearch(creature.name)
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
    <SectionHeading step="CREATURE" title="Creature library" count={`${creatures.length} saved`} />
    <div className="mb-4 flex items-end gap-3">
      <div className="relative min-w-0 flex-1">
        <FieldLabel>
          Select creature
          <TextInput
            aria-label="Select creature to edit or use"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isCreatureSearchOpen}
            aria-controls={isCreatureSearchOpen ? 'creature-library-options' : undefined}
            aria-activedescendant={
              isCreatureSearchOpen &&
              activeCreatureIndex >= 0 &&
              filteredCreatures[activeCreatureIndex]
                ? `creature-option-${filteredCreatures[activeCreatureIndex]?.id}`
                : undefined
            }
            placeholder="Search creatures..."
            value={creatureSearch}
            onFocus={() => {
              setActiveCreatureIndex(-1)
              setIsCreatureSearchOpen(true)
            }}
            onBlur={() => setIsCreatureSearchOpen(false)}
            onChange={(event) => {
              setCreatureSearch(event.target.value)
              setActiveCreatureIndex(-1)
              setIsCreatureSearchOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && filteredCreatures.length > 0) {
                event.preventDefault()
                setIsCreatureSearchOpen(true)
                setActiveCreatureIndex((index) =>
                  index < filteredCreatures.length - 1 ? index + 1 : 0,
                )
              } else if (event.key === 'ArrowUp' && filteredCreatures.length > 0) {
                event.preventDefault()
                setIsCreatureSearchOpen(true)
                setActiveCreatureIndex((index) =>
                  index > 0 ? index - 1 : filteredCreatures.length - 1,
                )
              } else if (
                event.key === 'Enter' &&
                isCreatureSearchOpen &&
                filteredCreatures.length > 0
              ) {
                event.preventDefault()
                selectCreatureAt(activeCreatureIndex >= 0 ? activeCreatureIndex : 0)
              } else if (event.key === 'Escape') {
                setIsCreatureSearchOpen(false)
                setActiveCreatureIndex(-1)
                setCreatureSearch(
                  creatures.find((creature) => creature.id === selectedCreatureId)?.name ?? '',
                )
              }
            }}
          />
        </FieldLabel>
        {isCreatureSearchOpen && (
          <ul
            id="creature-library-options"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-panel p-1 shadow-lg"
            role="listbox"
          >
            {filteredCreatures.length > 0 ? (
              filteredCreatures.map((creature, index) => (
                <li key={creature.id} role="presentation">
                  <button
                    id={`creature-option-${creature.id}`}
                    className={`w-full rounded px-3 py-2 text-left font-sans text-sm text-ink hover:bg-accent/10 ${
                      index === activeCreatureIndex ? 'bg-accent/10' : ''
                    }`}
                    type="button"
                    role="option"
                    aria-selected={creature.id === selectedCreatureId}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => beginEditing(creature)}
                  >
                    <span className="block">{creature.name}</span>
                    <span className="block text-xs text-muted">
                      {creature.source.toUpperCase()} · AC {creature.ac} · {creature.hpAverage} HP
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted" role="presentation">
                No matching creatures
              </li>
            )}
          </ul>
        )}
      </div>
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
