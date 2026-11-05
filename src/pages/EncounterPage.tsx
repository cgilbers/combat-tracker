import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, SelectInput, TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { SectionHeading } from '../components/SectionHeading'
import { TypeBadge } from '../components/TypeBadge'
import type { Creature, Encounter, Party } from '../domain/types'

type EncounterPageProps = {
  encounters: Encounter[]
  encounter: Encounter | null
  selectedEncounterId: string
  creatures: Creature[]
  parties: Party[]
  isHydrated: boolean
  onCreateDraft: (name: string) => void
  onSelectEncounter: (encounter: Encounter) => void
  onDeleteEncounter: (encounterId: string) => void
  onDuplicateEncounter: (encounter: Encounter) => void
  onUpdateEncounter: (encounter: Encounter) => void
  onAddCreatureGroup: (creatureId: string, quantity: number) => void
  onUpdateCreatureQuantity: (groupId: string, value: string) => void
  onUpdateGroupInitiative: (groupId: string, value: string) => void
  onRemoveGroup: (groupId: string) => void
  onStartEncounter: (party: Party, initiatives: Record<string, string>) => void
  onResumeEncounter: (encounter: Encounter) => void
}

export function EncounterPage({
  encounters,
  encounter,
  selectedEncounterId,
  creatures,
  parties,
  isHydrated,
  onCreateDraft,
  onSelectEncounter,
  onDeleteEncounter,
  onDuplicateEncounter,
  onUpdateEncounter,
  onAddCreatureGroup,
  onUpdateCreatureQuantity,
  onUpdateGroupInitiative,
  onRemoveGroup,
  onStartEncounter,
  onResumeEncounter,
}: EncounterPageProps) {
  const [encounterName, setEncounterName] = useState('The Old Watchtower')
  const [selectedCreatureId, setSelectedCreatureId] = useState('')
  const [creatureQuantity, setCreatureQuantity] = useState('1')
  const [launchPartyId, setLaunchPartyId] = useState('')
  const [pcInitiatives, setPcInitiatives] = useState<Record<string, string>>({})
  const effectiveLaunchPartyId = parties.some((party) => party.id === launchPartyId)
    ? launchPartyId
    : parties[0]?.id ?? ''
  const launchParty =
    parties.find((party) => party.id === effectiveLaunchPartyId) ?? null
  const canBeginEncounter = Boolean(
    encounter &&
      encounter.status === 'draft' &&
      encounter.creatureGroups.length > 0 &&
      encounter.creatureGroups.every(
        (group) =>
          Number.isFinite(group.initiative) &&
          Boolean(encounter.creatureSnapshots[group.creatureId]),
      ) &&
      launchParty &&
      launchParty.members.length > 0 &&
      launchParty.members.every(
        (member) =>
          pcInitiatives[member.id] !== undefined &&
          pcInitiatives[member.id] !== '' &&
          Number.isFinite(Number(pcInitiatives[member.id])),
      ),
  )

  const selectEncounter = (nextEncounter: Encounter) => {
    setPcInitiatives({})
    onSelectEncounter(nextEncounter)
  }

  const createDraft = () => {
    setPcInitiatives({})
    onCreateDraft(encounterName)
  }

  const addCreatureGroup = () => {
    if (!selectedCreatureId) return
    onAddCreatureGroup(selectedCreatureId, Number(creatureQuantity))
  }

  const selectParty = (partyId: string) => {
    setLaunchPartyId(partyId)
    setPcInitiatives({})
  }

  const beginEncounter = () => {
    if (!launchParty || !canBeginEncounter) return
    onStartEncounter(launchParty, pcInitiatives)
  }

  return (
    <Panel variant="builder">
      <SectionHeading step="ENCOUNTERS" title="Prepare an encounter." />
      <div className="space-y-4">
        <FieldLabel>
          New encounter name
          <TextInput
            value={encounterName}
            onChange={(event) => setEncounterName(event.target.value)}
          />
        </FieldLabel>
        <Button
          variant="primary"
          onClick={createDraft}
          disabled={!isHydrated}
        >
          Create draft
        </Button>
        <div className="border-t border-line pt-4">
          <h3 className="mb-3 font-mono text-[10px] tracking-[1px] text-muted">
            SAVED ENCOUNTERS ({encounters.length})
          </h3>
          {encounters.length === 0 ? (
            <p className="text-sm text-muted">Create a draft to start preparing an encounter.</p>
          ) : (
            <div className="space-y-2">
              {encounters.map((savedEncounter) => {
                const creatureCount = savedEncounter.creatureGroups.reduce(
                  (total, group) => total + group.quantity,
                  0,
                )
                return (
                  <div
                    key={savedEncounter.id}
                    className={`flex items-center justify-between gap-2 border border-line p-2 ${
                      savedEncounter.id === selectedEncounterId ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm text-ink"
                      onClick={() => selectEncounter(savedEncounter)}
                    >
                      <span className="block truncate font-medium">{savedEncounter.name}</span>
                      <span className="text-xs capitalize text-muted">
                        {savedEncounter.status} · {creatureCount} creatures
                      </span>
                    </button>
                    {savedEncounter.status !== 'active' ? (
                      <Button
                        variant="danger"
                        className="shrink-0"
                        onClick={() => onDeleteEncounter(savedEncounter.id)}
                      >
                        Delete
                      </Button>
                    ) : (
                      <Button
                        className="shrink-0"
                        onClick={() => onResumeEncounter(savedEncounter)}
                      >
                        Open combat
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {encounter && (
        <div className="mt-6 space-y-4 border-t border-line pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-[1px] text-accent">
                SELECTED / {encounter.status.toUpperCase()}
              </p>
              <h3 className="mt-1 font-display text-xl text-ink">{encounter.name}</h3>
            </div>
            {encounter.status !== 'active' && (
              <Button variant="danger" onClick={() => onDeleteEncounter(encounter.id)}>
                Delete
              </Button>
            )}
          </div>
          {encounter.status === 'draft' ? (
            <>
              <FieldLabel>
                Encounter name
                <TextInput
                  value={encounter.name}
                  onChange={(event) =>
                    onUpdateEncounter({ ...encounter, name: event.target.value })
                  }
                />
              </FieldLabel>
              <div className="flex flex-wrap items-end gap-3">
                <FieldLabel className="min-w-48 flex-1">
                  Saved creature
                  <SelectInput
                    aria-label="Saved creature to add"
                    value={selectedCreatureId}
                    onChange={(event) => setSelectedCreatureId(event.target.value)}
                  >
                    <option value="">Choose a saved creature</option>
                    {creatures.map((creature) => (
                      <option key={creature.id} value={creature.id}>
                        {creature.name}
                      </option>
                    ))}
                  </SelectInput>
                </FieldLabel>
                <FieldLabel className="max-w-32">
                  Quantity
                  <TextInput
                    type="number"
                    min="1"
                    max="12"
                    value={creatureQuantity}
                    onChange={(event) => setCreatureQuantity(event.target.value)}
                  />
                </FieldLabel>
                <Button
                  variant="primary"
                  onClick={addCreatureGroup}
                  disabled={!selectedCreatureId}
                >
                  Add creature group
                </Button>
              </div>
              {creatures.length === 0 && (
                <p className="text-sm text-muted">
                  Create or import creatures in Creature Library before adding them to an encounter.
                </p>
              )}
              <div className="space-y-3">
                {encounter.creatureGroups.map((group, index) => {
                  const creature = encounter.creatureSnapshots[group.creatureId]
                  return (
                    <div
                      key={group.id}
                      className="grid grid-cols-1 gap-3 border border-line p-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto] sm:items-end"
                    >
                      <div>
                        <strong className="block text-sm text-ink">
                          {creature?.name ?? 'Unknown creature'} · Group {index + 1}
                        </strong>
                        <span className="text-xs text-muted">
                          AC {creature?.ac ?? '—'} · {creature?.hpAverage ?? '—'} HP each
                        </span>
                      </div>
                      <FieldLabel>
                        Quantity
                        <TextInput
                          aria-label={`Quantity for ${creature?.name ?? 'creature'} group ${index + 1}`}
                          type="number"
                          min="1"
                          max="12"
                          value={group.quantity}
                          onChange={(event) =>
                            onUpdateCreatureQuantity(group.id, event.target.value)
                          }
                        />
                      </FieldLabel>
                      <FieldLabel>
                        Shared initiative
                        <TextInput
                          aria-label={`Initiative for ${creature?.name ?? 'creature'} group ${index + 1}`}
                          type="number"
                          value={group.initiative ?? ''}
                          onChange={(event) =>
                            onUpdateGroupInitiative(group.id, event.target.value)
                          }
                        />
                      </FieldLabel>
                      <Button variant="danger" onClick={() => onRemoveGroup(group.id)}>
                        Remove group
                      </Button>
                    </div>
                  )
                })}
                {encounter.creatureGroups.length === 0 && (
                  <p className="py-3 text-sm text-muted">
                    Add one or more creature groups to prepare this encounter.
                  </p>
                )}
              </div>
              <FieldLabel>
                Party for this encounter
                <SelectInput
                  aria-label="Party for this encounter"
                  value={effectiveLaunchPartyId}
                  onChange={(event) => selectParty(event.target.value)}
                >
                  <option value="">Choose a party</option>
                  {parties.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </SelectInput>
              </FieldLabel>
              {launchParty?.members.map((member) => (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_5rem] items-center gap-3 border-b border-line py-2"
                  key={member.id}
                >
                  <TypeBadge type="pc" />
                  <strong className="text-sm text-ink">{member.name}</strong>
                  <span className="hidden text-xs text-muted sm:inline">HP / AC at table</span>
                  <TextInput
                    aria-label={`Initiative for ${member.name}`}
                    type="number"
                    value={pcInitiatives[member.id] ?? ''}
                    onChange={(event) =>
                      setPcInitiatives((current) => ({
                        ...current,
                        [member.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              {launchParty && launchParty.members.length === 0 && (
                <p className="text-sm text-danger">
                  Add at least one PC to this party in Parties before starting.
                </p>
              )}
              <Button
                variant="primary"
                className="w-full"
                disabled={!canBeginEncounter}
                onClick={beginEncounter}
              >
                Start encounter and open Combat
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                This {encounter.status} encounter retains its creature snapshots and run state.
              </p>
              {encounter.status === 'active' && (
                <p className="text-xs text-muted">
                  Pause this encounter in Combat before deleting it.
                </p>
              )}
              {encounter.status === 'paused' && (
                <Button variant="primary" onClick={() => onResumeEncounter(encounter)}>
                  Resume encounter
                </Button>
              )}
              {encounter.status === 'active' && (
                <Button
                  variant="primary"
                  onClick={() => onResumeEncounter(encounter)}
                >
                  Open combat
                </Button>
              )}
              {encounter.status === 'complete' && (
                <Button onClick={() => onDuplicateEncounter(encounter)}>
                  Duplicate as new draft
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
