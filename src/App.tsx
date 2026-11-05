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
import { CombatPage } from './pages/CombatPage'
import { CreaturePage } from './pages/CreaturePage'
import { EncounterPage } from './pages/EncounterPage'
import { PartyPage } from './pages/PartyPage'

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
          {workspace === 'parties' && (
            <PartyPage
              parties={parties}
              selectedPartyId={selectedPartyId}
              party={party}
              pcName={pcName}
              pcNotes={pcNotes}
              onSelectParty={setSelectedPartyId}
              onCreateParty={createParty}
              onDeleteParty={removeParty}
              onUpdateParty={updateSelectedParty}
              onPcNameChange={setPcName}
              onPcNotesChange={setPcNotes}
              onAddPc={addPc}
              onRemovePc={removePc}
            />
          )}
          {workspace === 'creatures' && (
            <CreaturePage
              creatures={creatures}
              selectedCreatureId={selectedCreatureId}
              onSelectCreature={setSelectedCreatureId}
              onSaveCreature={persistCreature}
              onDeleteCreature={removeCreature}
            />
          )}
          {workspace === 'encounters' && (
            <EncounterPage
              encounters={encounters}
              encounter={encounter}
              selectedEncounterId={selectedEncounterId}
              creatures={creatures}
              parties={parties}
              launchParty={launchParty}
              launchPartyId={launchPartyId}
              encounterName={encounterName}
              selectedCreatureId={selectedCreatureId}
              creatureQuantity={creatureQuantity}
              pcInitiatives={pcInitiatives}
              canBeginEncounter={canBeginEncounter}
              isHydrated={isHydrated}
              onEncounterNameChange={setEncounterName}
              onCreateDraft={createEncounterDraft}
              onSelectEncounter={selectEncounter}
              onDeleteEncounter={deleteEncounterRecord}
              onDuplicateEncounter={duplicateEncounter}
              onUpdateEncounter={updateEncounter}
              onSelectCreature={setSelectedCreatureId}
              onCreatureQuantityChange={setCreatureQuantity}
              onAddCreatureGroup={addCreatureToEncounter}
              onUpdateCreatureQuantity={updateCreatureQuantity}
              onUpdateGroupInitiative={updateGroupInitiative}
              onRemoveGroup={removeGroup}
              onSelectParty={(partyId) => {
                setLaunchPartyId(partyId)
                setPcInitiatives({})
              }}
              onPcInitiativeChange={(memberId, value) =>
                setPcInitiatives((currentInitiatives) => ({
                  ...currentInitiatives,
                  [memberId]: value,
                }))
              }
              onStartEncounter={beginEncounter}
              onResumeEncounter={resumeEncounter}
            />
          )}
        </div>
        {workspace === 'combat' && (
          <CombatPage
            encounter={encounter}
            hpAdjustment={hpAdjustment}
            activeCombatantName={activeCombatant?.name}
            onHpAdjustmentChange={setHpAdjustment}
            onNextTurn={advanceTurn}
            onPause={pauseSelectedEncounter}
            onComplete={finishEncounter}
            onAdjustCreatureHp={adjustCreatureHp}
            onBackToEncounters={() => setWorkspace('encounters')}
          />
        )}
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
