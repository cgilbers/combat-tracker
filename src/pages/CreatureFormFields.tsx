import { FieldLabel, TextArea, TextInput } from '../components/FormControls'
import type { AbilityScores } from '../domain/types'
import type { CreatureForm } from './creatureFormTypes'

type CreatureFormFieldsProps = {
  form: CreatureForm
  onUpdateField: <K extends keyof CreatureForm>(
    key: K,
    value: CreatureForm[K],
  ) => void
  onUpdateAbility: (ability: keyof AbilityScores, value: string) => void
}

const abilityKeys: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function CreatureFormFields({
  form,
  onUpdateField,
  onUpdateAbility,
}: CreatureFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FieldLabel className="col-span-full">
          Name
          <TextInput
            aria-label="Creature name"
            value={form.name}
            onChange={(event) => onUpdateField('name', event.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Type
          <TextInput value={form.type} onChange={(event) => onUpdateField('type', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Size
          <TextInput value={form.size} onChange={(event) => onUpdateField('size', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Alignment
          <TextInput value={form.alignment} onChange={(event) => onUpdateField('alignment', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          AC
          <TextInput aria-label="Creature AC" type="number" min="1" value={form.ac} onChange={(event) => onUpdateField('ac', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Average HP
          <TextInput aria-label="Creature average HP" type="number" min="1" value={form.hpAverage} onChange={(event) => onUpdateField('hpAverage', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          HP formula
          <TextInput placeholder="4d8 + 4" value={form.hpFormula} onChange={(event) => onUpdateField('hpFormula', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Speed
          <TextInput placeholder="30 ft., fly 60 ft." value={form.speed} onChange={(event) => onUpdateField('speed', event.target.value)} />
        </FieldLabel>
      </div>
      <fieldset className="my-5 border border-line p-4">
        <legend className="px-2 font-mono text-[10px] tracking-[.5px] text-accent">Ability scores</legend>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {abilityKeys.map((ability) => (
            <FieldLabel className="min-w-0" key={ability}>
              {ability.toUpperCase()}
              <TextInput
                aria-label={`${ability.toUpperCase()} ability score`}
                type="number"
                min="1"
                value={form.abilities[ability]}
                onChange={(event) => onUpdateAbility(ability, event.target.value)}
              />
            </FieldLabel>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FieldLabel>
          Saving throws
          <TextArea aria-label="Creature saving throws" placeholder={'Dex: 3\nCon: 2'} value={form.savingThrows} onChange={(event) => onUpdateField('savingThrows', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Skills
          <TextArea aria-label="Creature skills" placeholder={'Perception: 4\nStealth: 3'} value={form.skills} onChange={(event) => onUpdateField('skills', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Senses
          <TextInput value={form.senses} onChange={(event) => onUpdateField('senses', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Languages
          <TextInput value={form.languages} onChange={(event) => onUpdateField('languages', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Challenge rating
          <TextInput aria-label="Creature challenge rating" type="number" min="0" step="any" value={form.challengeRating} onChange={(event) => onUpdateField('challengeRating', event.target.value)} />
        </FieldLabel>
        <FieldLabel>
          XP
          <TextInput aria-label="Creature XP" type="number" min="0" step="1" value={form.xp} onChange={(event) => onUpdateField('xp', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Traits
          <TextArea aria-label="Creature traits" placeholder="Name: Description (one per line)" value={form.traits} onChange={(event) => onUpdateField('traits', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Actions
          <TextArea aria-label="Creature actions" placeholder="Name: Description (one per line)" value={form.actions} onChange={(event) => onUpdateField('actions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Reactions
          <TextArea aria-label="Creature reactions" placeholder="Name: Description (one per line)" value={form.reactions} onChange={(event) => onUpdateField('reactions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Legendary actions
          <TextArea aria-label="Creature legendary actions" placeholder="Name: Description (one per line)" value={form.legendaryActions} onChange={(event) => onUpdateField('legendaryActions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Lair actions
          <TextArea aria-label="Creature lair actions" placeholder="Name: Description (one per line)" value={form.lairActions} onChange={(event) => onUpdateField('lairActions', event.target.value)} />
        </FieldLabel>
        <FieldLabel className="col-span-full">
          Spellcasting
          <TextArea aria-label="Creature spellcasting" value={form.spellcasting} onChange={(event) => onUpdateField('spellcasting', event.target.value)} />
        </FieldLabel>
      </div>
      <fieldset className="my-5 border border-line p-4">
        <legend className="px-2 font-mono text-[10px] tracking-[.5px] text-accent">Boss resource limits</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FieldLabel>
            Spell slots by level
            <TextArea aria-label="Spell slot limits" placeholder={'1: 4\n2: 3'} value={form.spellSlots} onChange={(event) => onUpdateField('spellSlots', event.target.value)} />
          </FieldLabel>
          <FieldLabel>
            Legendary action limit
            <TextInput aria-label="Legendary action limit" type="number" min="0" step="1" value={form.legendaryActionLimit} onChange={(event) => onUpdateField('legendaryActionLimit', event.target.value)} />
          </FieldLabel>
          <FieldLabel>
            Legendary resistance limit
            <TextInput aria-label="Legendary resistance limit" type="number" min="0" step="1" value={form.legendaryResistanceLimit} onChange={(event) => onUpdateField('legendaryResistanceLimit', event.target.value)} />
          </FieldLabel>
          <label className="flex flex-row items-center justify-between gap-2 self-end border border-line bg-input px-3 py-3 font-mono text-[10px] tracking-[.3px] text-muted uppercase">
            Has lair actions
            <input className="size-4 accent-accent" type="checkbox" checked={form.hasLairActions} onChange={(event) => onUpdateField('hasLairActions', event.target.checked)} />
          </label>
        </div>
      </fieldset>
      <FieldLabel className="mb-4">
        Tags
        <TextInput placeholder="goblin, boss, undead" value={form.tags} onChange={(event) => onUpdateField('tags', event.target.value)} />
      </FieldLabel>
    </>
  )
}
