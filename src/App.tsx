import { useEffect, useState } from 'react'
import {
  activateEncounter,
  addCreatureGroup,
  completeEncounter,
  createDraftEncounter,
  duplicateEncounter as duplicateEncounterRecord,
  nextTurn,
  pauseEncounter,
  removeCreatureGroup,
  startEncounter,
  updateCreatureGroup,
  updateCreatureHp,
} from './combat/engine'
import { Button } from './components/Button'
import { CountBadge } from './components/CountBadge'
import { FieldLabel, SelectInput, TextInput } from './components/FormControls'
import { Panel } from './components/Panel'
import { SectionHeading } from './components/SectionHeading'
import { TypeBadge } from './components/TypeBadge'
import { CreatureLibrary } from './creatures/CreatureLibrary'
import {
  createBackup,
  deleteCreature,
  deleteEncounter,
  deleteParty,
  loadAppData,
  parseBackup,
  restoreBackup,
  saveAppData,
  saveCreature,
  saveParty,
} from './data/database'
import type { Creature, Encounter, Party } from './domain/types'

const createId = () => crypto.randomUUID()
type Workspace = 'parties' | 'creatures' | 'encounters' | 'combat'

function App() {
  const [workspace, setWorkspace] = useState<Workspace>('encounters')
  const [parties, setParties] = useState<Party[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState('')
  const [launchPartyId, setLaunchPartyId] = useState('')
  const [pcName, setPcName] = useState('')
  const [pcNotes, setPcNotes] = useState('')
  const [pcInitiatives, setPcInitiatives] = useState<Record<string, string>>({})
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [selectedCreatureId, setSelectedCreatureId] = useState('')
  const [creatureQuantity, setCreatureQuantity] = useState('1')
  const [encounterName, setEncounterName] = useState('The Old Watchtower')
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const [hpAdjustment, setHpAdjustment] = useState('1')
  const [isHydrated, setIsHydrated] = useState(false)
  const [storageError, setStorageError] = useState('')
  const party = parties.find((item) => item.id === selectedPartyId) ?? null
  const launchParty = parties.find((item) => item.id === launchPartyId) ?? null
  const encounter = encounters.find((item) => item.id === selectedEncounterId) ?? null

  useEffect(() => {
    let isCancelled = false

    loadAppData()
      .then((data) => {
        if (isCancelled) return
        setParties(data.parties)
        setSelectedPartyId(data.parties[0]?.id ?? '')
        setLaunchPartyId(data.parties[0]?.id ?? '')
        setCreatures(data.creatures)
        setEncounters(data.encounters)
        const selectedEncounter =
          data.encounters.find((item) => item.status === 'paused') ??
          data.encounters[0] ??
          null
        setSelectedEncounterId(selectedEncounter?.id ?? '')
      })
      .catch(() => {
        if (!isCancelled) setStorageError('Saved data could not be loaded. You can continue in memory.')
      })
      .finally(() => {
        if (!isCancelled) setIsHydrated(true)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (party) {
      saveParty(party).catch(() => {
        setStorageError('Party changes could not be saved locally.')
      })
    }
  }, [party, isHydrated])

  useEffect(() => {
    if (!isHydrated) return

    saveAppData({ encounters })
      .then(() => setStorageError(''))
      .catch(() => {
        setStorageError('Encounter changes could not be saved locally.')
      })
  }, [encounters, isHydrated])

  const createParty = () => {
    const newParty: Party = {
      id: createId(),
      name: `New party ${parties.length + 1}`,
      members: [],
    }
    setParties((currentParties) => [...currentParties, newParty])
    setSelectedPartyId(newParty.id)
    setLaunchPartyId(newParty.id)
    setPcInitiatives({})
  }

  const removeParty = async () => {
    if (!party) return

    const removedPartyId = party.id
    const remainingParties = parties.filter((item) => item.id !== removedPartyId)
    const nextPartyId = remainingParties[0]?.id ?? ''

    setParties(remainingParties)
    if (selectedPartyId === removedPartyId) setSelectedPartyId(nextPartyId)
    if (launchPartyId === removedPartyId) {
      setLaunchPartyId(nextPartyId)
      setPcInitiatives({})
    }

    try {
      await deleteParty(removedPartyId)
      setStorageError('')
    } catch {
      setStorageError('Party could not be deleted from local storage.')
    }
  }

  const updateSelectedParty = (update: (currentParty: Party) => Party) => {
    if (!party) return
    setParties((currentParties) =>
      currentParties.map((item) => (item.id === party.id ? update(item) : item)),
    )
  }

  const addPc = () => {
    const name = pcName.trim()
    if (!name || !party) return

    updateSelectedParty((currentParty) => ({
      ...currentParty,
      members: [
        ...currentParty.members,
        {
          id: createId(),
          name,
          notes: pcNotes.trim() || undefined,
        },
      ],
    }))
    setPcName('')
    setPcNotes('')
  }

  const removePc = (characterId: string) => {
    updateSelectedParty((currentParty) => ({
      ...currentParty,
      members: currentParty.members.filter((member) => member.id !== characterId),
    }))
    setPcInitiatives((currentInitiatives) => {
      const remainingInitiatives = { ...currentInitiatives }
      delete remainingInitiatives[characterId]
      return remainingInitiatives
    })
  }

  const persistCreature = async (creature: Creature) => {
    try {
      await saveCreature(creature)
      setCreatures((currentCreatures) => {
        const exists = currentCreatures.some((item) => item.id === creature.id)
        return exists
          ? currentCreatures.map((item) => (item.id === creature.id ? creature : item))
          : [...currentCreatures, creature]
      })
      setStorageError('')
    } catch (error) {
      setStorageError('Creature could not be saved locally.')
      throw error
    }
  }

  const removeCreature = async (creatureId: string) => {
    try {
      await deleteCreature(creatureId)
      setCreatures((currentCreatures) =>
        currentCreatures.filter((creature) => creature.id !== creatureId),
      )
      if (selectedCreatureId === creatureId) setSelectedCreatureId('')
      setStorageError('')
    } catch (error) {
      setStorageError('Creature could not be deleted from local storage.')
      throw error
    }
  }

  const createEncounterDraft = () => {
    const newEncounter = createDraftEncounter(
      createId(),
      encounterName.trim() || `New encounter ${encounters.length + 1}`,
    )
    setEncounters((currentEncounters) => [...currentEncounters, newEncounter])
    setSelectedEncounterId(newEncounter.id)
    setPcInitiatives({})
  }

  const updateEncounter = (updatedEncounter: Encounter) => {
    setEncounters((currentEncounters) =>
      currentEncounters.map((item) =>
        item.id === updatedEncounter.id ? updatedEncounter : item,
      ),
    )
  }

  const addCreatureToEncounter = () => {
    const creature = creatures.find((item) => item.id === selectedCreatureId)
    if (!encounter || encounter.status !== 'draft' || !creature) return

    updateEncounter(
      addCreatureGroup(encounter, creature, Number(creatureQuantity), createId),
    )
  }

  const updateCreatureQuantity = (groupId: string, value: string) => {
    if (!encounter) return
    updateEncounter(
      updateCreatureGroup(encounter, groupId, { quantity: Number(value) }),
    )
  }

  const updateGroupInitiative = (groupId: string, value: string) => {
    if (!encounter) return
    updateEncounter(
      updateCreatureGroup(encounter, groupId, {
        initiative: value === '' ? null : Number(value),
      }),
    )
  }

  const removeGroup = (groupId: string) => {
    if (!encounter) return
    updateEncounter(removeCreatureGroup(encounter, groupId))
  }

  const selectEncounter = (nextEncounter: Encounter) => {
    setSelectedEncounterId(nextEncounter.id)
    setPcInitiatives({})
  }

  const deleteEncounterRecord = async (encounterId: string) => {
    if (!window.confirm('Delete this saved encounter? This cannot be undone.')) return

    try {
      await deleteEncounter(encounterId)
      const remainingEncounters = encounters.filter((item) => item.id !== encounterId)
      setEncounters(remainingEncounters)
      if (selectedEncounterId === encounterId) {
        setSelectedEncounterId(remainingEncounters[0]?.id ?? '')
      }
      setStorageError('')
    } catch {
      setStorageError('Saved encounter could not be deleted locally.')
    }
  }

  const duplicateEncounter = (sourceEncounter: Encounter) => {
    const duplicate = duplicateEncounterRecord(sourceEncounter, createId)
    setEncounters((currentEncounters) => [...currentEncounters, duplicate])
    setSelectedEncounterId(duplicate.id)
  }

  const beginEncounter = () => {
    if (!encounter || encounter.status !== 'draft' || !launchParty) return

    const startedEncounter = startEncounter(
      encounter,
      launchParty,
      Object.fromEntries(
        launchParty.members.map((member) => [
          member.id,
          Number(pcInitiatives[member.id]),
        ]),
      ),
      createId,
    )
    setEncounters((currentEncounters) =>
      currentEncounters.map((item) =>
        item.status === 'active'
          ? pauseEncounter(item)
          : item.id === startedEncounter.id
            ? startedEncounter
            : item,
      ),
    )
    setWorkspace('combat')
  }

  const resumeEncounter = (encounterToResume: Encounter) => {
    setEncounters((currentEncounters) =>
      activateEncounter(currentEncounters, encounterToResume.id),
    )
    setSelectedEncounterId(encounterToResume.id)
    setWorkspace('combat')
  }

  const pauseSelectedEncounter = () => {
    if (encounter) updateEncounter(pauseEncounter(encounter))
  }

  const finishEncounter = () => {
    if (encounter) updateEncounter(completeEncounter(encounter))
  }

  const advanceTurn = () => {
    if (encounter) updateEncounter(nextTurn(encounter))
  }

  const adjustCreatureHp = (combatantId: string, direction: 'damage' | 'heal') => {
    const amount = Math.abs(Number(hpAdjustment) || 0)
    if (amount === 0 || !encounter) return

    updateEncounter(
      updateCreatureHp(
        encounter,
        combatantId,
        direction === 'damage' ? -amount : amount,
      ),
    )
  }

  const exportData = async () => {
    try {
      const backup = await createBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `combat-tracker-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setStorageError('')
    } catch {
      setStorageError('Backup export failed.')
    }
  }

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      await restoreBackup(parseBackup(await file.text()))
      const data = await loadAppData()
      setParties(data.parties)
      setSelectedPartyId(data.parties[0]?.id ?? '')
      setLaunchPartyId(data.parties[0]?.id ?? '')
      setPcInitiatives({})
      setCreatures(data.creatures)
      setEncounters(data.encounters)
      const selectedEncounter =
        data.encounters.find((item) => item.status === 'paused') ??
        data.encounters[0] ??
        null
      setSelectedEncounterId(selectedEncounter?.id ?? '')
      setStorageError('')
    } catch {
      setStorageError('That file is not a valid combat tracker backup.')
    }
  }

  const activeCombatant = encounter?.combatants[encounter.currentTurnIndex]
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
      <header className="mb-8 flex items-start justify-between gap-6 border-b border-line pb-7 sm:mb-10">
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[1.1px] text-lime">FIELD NOTES / 01</p>
          <h1 className="font-display text-4xl leading-tight font-medium text-ink sm:text-5xl">
            Initiative, at a glance.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted">
            A quiet command deck for the messy middle of a fight.
          </p>
        </div>
        {workspace === 'combat' && (
          <div className="grid size-16 shrink-0 content-center justify-items-center border border-line sm:size-20">
            <span className="font-mono text-[10px] tracking-[1px] text-muted">ROUND</span>
            <strong className="font-display text-2xl font-normal text-lime">
              {encounter?.status === 'active' ? encounter.round : '—'}
            </strong>
          </div>
        )}
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          role={storageError ? 'alert' : 'status'}
          className={`mr-auto font-mono text-[10px] tracking-[.7px] ${
            storageError ? 'text-orange' : 'text-muted'
          }`}
        >
          {storageError || (isHydrated ? 'SAVED LOCALLY' : 'LOADING SAVED DATA')}
        </span>
        <Button onClick={exportData} disabled={!isHydrated}>Export JSON</Button>
        <label className="cursor-pointer border border-line bg-transparent px-3 py-2 font-mono text-[10px] text-muted transition-colors hover:border-lime hover:text-lime">
          Import JSON
          <input
            type="file"
            className="sr-only"
            accept="application/json,.json"
            onChange={importData}
            disabled={!isHydrated}
          />
        </label>
      </div>

      <nav aria-label="Main workspaces" className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {([
          ['parties', 'Parties'],
          ['creatures', 'Creature Library'],
          ['encounters', 'Encounters'],
        ] as const).map(([id, label]) => (
          <Button
            key={id}
            variant={workspace === id ? 'primary' : 'secondary'}
            aria-pressed={workspace === id}
            onClick={() => setWorkspace(id)}
          >
            {label}
          </Button>
        ))}
      </nav>

      <section
        className={`grid grid-cols-1 items-start gap-5 ${
          workspace === 'combat'
            ? 'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
            : ''
        }`}
      >
        <div className="space-y-5">
          {workspace === 'parties' && <Panel>
            <SectionHeading step="01 / PARTY" title="Who is adventuring?" count={`${party?.members.length ?? 0} PCs`} />
            <div className="mb-5 flex items-end gap-3">
              <FieldLabel className="min-w-0 flex-1">
                Select party
                <SelectInput
                  aria-label="Select party to manage"
                  value={selectedPartyId}
                  onChange={(event) => setSelectedPartyId(event.target.value)}
                >
                  <option value="">No party selected</option>
                  {parties.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </SelectInput>
              </FieldLabel>
              <Button onClick={createParty} className="shrink-0">
                New party
              </Button>
            </div>
            {party && (
              <>
                <FieldLabel className="mb-5">
                  Party name
                  <TextInput
                    aria-label="Party name"
                    value={party.name}
                    onChange={(event) =>
                      updateSelectedParty((currentParty) => ({
                        ...currentParty,
                        name: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
                <div className="mb-5 flex items-end gap-3">
                  <FieldLabel className="min-w-0 flex-1">
                    Character name
                    <TextInput
                      placeholder="Mira"
                      value={pcName}
                      onChange={(event) => setPcName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && addPc()}
                    />
                  </FieldLabel>
                  <FieldLabel className="min-w-0 flex-1">
                    Notes
                    <TextInput
                      placeholder="Class, level, or other notes"
                      value={pcNotes}
                      onChange={(event) => setPcNotes(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && addPc()}
                    />
                  </FieldLabel>
                  <Button
                    variant="icon"
                    onClick={addPc}
                    aria-label="Add character"
                  >
                    +
                  </Button>
                </div>
                <div className="mb-4 space-y-3">
                  {party.members.map((member) => (
                    <div className="grid grid-cols-1 items-end gap-3 border-b border-line pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" key={member.id}>
                      <FieldLabel>
                        Character name
                        <TextInput
                          aria-label={`Name for ${member.name}`}
                          value={member.name}
                          onChange={(event) =>
                            updateSelectedParty((currentParty) => ({
                              ...currentParty,
                              members: currentParty.members.map((currentMember) =>
                                currentMember.id === member.id
                                  ? { ...currentMember, name: event.target.value }
                                  : currentMember,
                              ),
                            }))
                          }
                        />
                      </FieldLabel>
                      <FieldLabel>
                        Notes
                        <TextInput
                          aria-label={`Notes for ${member.name}`}
                          value={member.notes ?? ''}
                          onChange={(event) =>
                            updateSelectedParty((currentParty) => ({
                              ...currentParty,
                              members: currentParty.members.map((currentMember) =>
                                currentMember.id === member.id
                                  ? {
                                      ...currentMember,
                                      notes: event.target.value || undefined,
                                    }
                                  : currentMember,
                              ),
                            }))
                          }
                        />
                      </FieldLabel>
                      <Button
                        variant="danger"
                        onClick={() => removePc(member.id)}
                        aria-label={`Remove ${member.name}`}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {party.members.length === 0 && (
                    <p className="py-3 text-sm text-muted">Add the adventurers who will be acting.</p>
                  )}
                </div>
                <Button variant="danger" onClick={removeParty}>
                  Delete party
                </Button>
              </>
            )}
            {!party && <p className="mb-4 text-sm text-muted">Create a party to manage its PCs.</p>}
            <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              Players keep their own HP and AC. This tracker only holds their place in initiative.
            </p>
          </Panel>}

          {workspace === 'creatures' && <CreatureLibrary
            creatures={creatures}
            selectedCreatureId={selectedCreatureId}
            onSelectCreature={setSelectedCreatureId}
            onSaveCreature={persistCreature}
            onDeleteCreature={removeCreature}
          />}

          {workspace === 'encounters' && <Panel variant="builder">
            <SectionHeading step="02 / ENCOUNTERS" title="Prepare an encounter." />
            <div className="space-y-4">
              <FieldLabel>
                New encounter name
                <TextInput
                  value={encounterName}
                  onChange={(event) => setEncounterName(event.target.value)}
                />
              </FieldLabel>
              <Button variant="primary" onClick={createEncounterDraft} disabled={!isHydrated}>
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
                            savedEncounter.id === selectedEncounterId ? 'bg-panel' : ''
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
                          {savedEncounter.status !== 'active' && (
                            <Button
                              variant="danger"
                              className="shrink-0"
                              onClick={() => deleteEncounterRecord(savedEncounter.id)}
                            >
                              Delete
                            </Button>
                          )}
                          {savedEncounter.status === 'active' && (
                            <Button
                              className="shrink-0"
                              onClick={() => resumeEncounter(savedEncounter)}
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
                    <p className="font-mono text-[10px] tracking-[1px] text-lime">
                      SELECTED / {encounter.status.toUpperCase()}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-ink">{encounter.name}</h3>
                  </div>
                  {encounter.status !== 'active' && (
                    <Button variant="danger" onClick={() => deleteEncounterRecord(encounter.id)}>
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
                          updateEncounter({ ...encounter, name: event.target.value })
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
                        onClick={addCreatureToEncounter}
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
                          <div key={group.id} className="grid grid-cols-1 gap-3 border border-line p-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto] sm:items-end">
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
                                  updateCreatureQuantity(group.id, event.target.value)
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
                                  updateGroupInitiative(group.id, event.target.value)
                                }
                              />
                            </FieldLabel>
                            <Button variant="danger" onClick={() => removeGroup(group.id)}>
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
                        value={launchPartyId}
                        onChange={(event) => {
                          setLaunchPartyId(event.target.value)
                          setPcInitiatives({})
                        }}
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
                            setPcInitiatives((currentInitiatives) => ({
                              ...currentInitiatives,
                              [member.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                    {launchParty && launchParty.members.length === 0 && (
                      <p className="text-sm text-orange">
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
                      <Button variant="primary" onClick={() => resumeEncounter(encounter)}>
                        Resume encounter
                      </Button>
                    )}
                    {encounter.status === 'active' && (
                      <Button variant="primary" onClick={() => resumeEncounter(encounter)}>
                        Open combat
                      </Button>
                    )}
                    {encounter.status === 'complete' && (
                      <Button onClick={() => duplicateEncounter(encounter)}>
                        Duplicate as new draft
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Panel>}
        </div>

        {workspace === 'combat' && <Panel
          variant="combat"
          className={encounter?.status === 'active' ? 'border-lime/50' : ''}
        >
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <span className="font-mono text-[11px] tracking-[1.1px] text-lime">04 / COMBAT RUN</span>
              <h2 className="mt-2 font-display text-[26px] leading-tight font-medium text-ink">
                {encounter?.name ?? 'No encounter prepared'}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              {encounter?.status === 'active' && (
                <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[1px] text-lime">
                  <i className="size-2 rounded-full bg-lime" /> LIVE
                </span>
              )}
              <Button onClick={() => setWorkspace('encounters')}>
                Back to encounters
              </Button>
            </div>
          </div>
          {!encounter && (
            <div className="grid min-h-80 place-content-center justify-items-center text-center">
              <div className="mb-4 font-display text-4xl text-lime" aria-hidden="true">✦</div>
              <h3 className="font-display text-xl text-ink">No encounter selected.</h3>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Select an encounter from Encounters to begin or resume combat.
              </p>
            </div>
          )}
          {encounter?.status === 'complete' && (
            <p className="text-sm text-muted">This encounter is complete and retained as history.</p>
          )}
          {encounter?.status === 'paused' && (
            <p className="text-sm text-muted">
              This encounter is paused. Return to Encounters to resume it.
            </p>
          )}
          {encounter?.status === 'active' && (
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border border-line bg-panel p-4">
                <div>
                  <span className="font-mono text-[10px] tracking-[1px] text-lime">NOW ACTING</span>
                  <strong className="mt-1 block font-display text-xl text-ink">
                    {activeCombatant?.name}
                  </strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={advanceTurn}>
                    Next turn <span aria-hidden="true">→</span>
                  </Button>
                  <Button onClick={pauseSelectedEncounter}>Pause</Button>
                  <Button variant="danger" onClick={finishEncounter}>Complete</Button>
                </div>
              </div>
              <div className="space-y-3">
                {encounter.combatants.map((combatant, index) => (
                  <div
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:p-4 ${
                      index === encounter.currentTurnIndex
                        ? 'border-lime/50 bg-[#20271e]'
                        : 'border-line bg-panel'
                    } ${combatant.isDefeated ? 'opacity-50' : ''}`}
                    key={combatant.id}
                  >
                    <TypeBadge type={combatant.type} />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-ink">{combatant.name}</strong>
                      <small className="text-xs text-muted">
                        {combatant.type === 'pc' ? 'Player character' : 'Creature'}
                      </small>
                    </div>
                    <CountBadge className="text-center">{combatant.initiative}</CountBadge>
                    {combatant.type === 'creature' ? (
                      <div className="col-span-3 grid grid-cols-2 items-center gap-2 border-t border-line pt-3 sm:col-span-1 sm:grid-cols-1 sm:border-0 sm:pt-0">
                        <div className="text-sm">
                          <strong className="text-ink">{combatant.currentHp}</strong>
                          <span className="ml-1 text-xs text-muted">/ {combatant.maxHp} HP · AC {combatant.ac}</span>
                        </div>
                        <div className="col-span-2 grid grid-cols-[auto_minmax(3rem,1fr)_auto_auto] items-center gap-2 sm:col-span-1">
                          <label className="font-mono text-[10px] text-muted" htmlFor={`hp-adjustment-${combatant.id}`}>
                            Amount
                          </label>
                          <TextInput
                            id={`hp-adjustment-${combatant.id}`}
                            type="number"
                            min="1"
                            value={hpAdjustment}
                            onChange={(event) => setHpAdjustment(event.target.value)}
                          />
                          <Button variant="damage" onClick={() => adjustCreatureHp(combatant.id, 'damage')}>
                            Damage
                          </Button>
                          <Button variant="heal" onClick={() => adjustCreatureHp(combatant.id, 'heal')}>
                            Heal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="hidden text-xs text-muted sm:block">HP / AC at table</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>}
      </section>
      <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-4 font-mono text-[9px] tracking-[.8px] text-dim">
        <span>LOCAL SESSION</span>
        <span>NO CLOUD / NO DISTRACTIONS</span>
        <span>COMBAT TRACKER MVP</span>
      </footer>
    </main>
  )
}

export default App
