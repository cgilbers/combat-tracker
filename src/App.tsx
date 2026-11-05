import { useState, type ChangeEvent } from 'react'
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
import { useAppData } from './data/useAppData'
import type { Encounter, Party } from './domain/types'
import { CombatPage } from './pages/CombatPage'
import { CreaturePage } from './pages/CreaturePage'
import { EncounterPage } from './pages/EncounterPage'
import { PartyPage } from './pages/PartyPage'

type Workspace = 'parties' | 'creatures' | 'encounters' | 'combat'
const createId = () => crypto.randomUUID()

function App() {
  const [workspace, setWorkspace] = useState<Workspace>('encounters')
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const {
    parties,
    creatures,
    encounters,
    isHydrated,
    storageError,
    setStorageError,
    createParty,
    updateParty,
    deleteParty,
    saveCreature,
    deleteCreature,
    updateEncounters,
    deleteEncounter,
    exportBackup,
    importBackup,
  } = useAppData()
  const effectiveEncounterId = encounters.some(
    (item) => item.id === selectedEncounterId,
  )
    ? selectedEncounterId
    : (
        encounters.find((item) => item.status === 'paused') ?? encounters[0]
      )?.id ?? ''
  const encounter = encounters.find((item) => item.id === effectiveEncounterId) ?? null

  const updateEncounter = (updatedEncounter: Encounter) => {
    updateEncounters((currentEncounters) =>
      currentEncounters.map((item) =>
        item.id === updatedEncounter.id ? updatedEncounter : item,
      ),
    )
  }

  const createEncounterDraft = (name: string) => {
    const newEncounter = createDraftEncounter(
      createId(),
      name.trim() || `New encounter ${encounters.length + 1}`,
    )
    updateEncounters((currentEncounters) => [...currentEncounters, newEncounter])
    setSelectedEncounterId(newEncounter.id)
  }

  const addCreatureToEncounter = (creatureId: string, quantity: number) => {
    const creature = creatures.find((item) => item.id === creatureId)
    if (!encounter || encounter.status !== 'draft' || !creature) return
    updateEncounter(addCreatureGroup(encounter, creature, quantity, createId))
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
    if (encounter) updateEncounter(removeCreatureGroup(encounter, groupId))
  }

  const deleteEncounterRecord = async (encounterId: string) => {
    if (!window.confirm('Delete this saved encounter? This cannot be undone.')) return
    const deleted = await deleteEncounter(encounterId)
    if (deleted && selectedEncounterId === encounterId) {
      setSelectedEncounterId(
        encounters.find((item) => item.id !== encounterId)?.id ?? '',
      )
    }
  }

  const duplicateEncounter = (sourceEncounter: Encounter) => {
    const duplicate = duplicateEncounterRecord(sourceEncounter, createId)
    updateEncounters((currentEncounters) => [...currentEncounters, duplicate])
    setSelectedEncounterId(duplicate.id)
  }

  const beginEncounter = (party: Party, pcInitiatives: Record<string, string>) => {
    if (!encounter || encounter.status !== 'draft') return
    const startedEncounter = startEncounter(
      encounter,
      party,
      Object.fromEntries(
        party.members.map((member) => [member.id, Number(pcInitiatives[member.id])]),
      ),
      createId,
    )
    updateEncounters((currentEncounters) =>
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
    updateEncounters((currentEncounters) =>
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

  const adjustCreatureHp = (
    combatantId: string,
    direction: 'damage' | 'heal',
    adjustment: string,
  ) => {
    const amount = Math.abs(Number(adjustment) || 0)
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
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
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

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      const data = await importBackup(await file.text())
      const selectedEncounter =
        data.encounters.find((item) => item.status === 'paused') ??
        data.encounters[0]
      setSelectedEncounterId(selectedEncounter?.id ?? '')
      setStorageError('')
    } catch {
      setStorageError('That file is not a valid combat tracker backup.')
    }
  }

  const activeCombatant = encounter?.combatants[encounter.currentTurnIndex]

  return (
    <main
      className={`mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-8 lg:px-12 ${
        workspace === 'combat'
          ? 'h-dvh min-h-0 overflow-hidden py-3 sm:py-4'
          : 'min-h-screen py-6 sm:py-8'
      }`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-4 border-b border-line pb-3 ${
          workspace === 'combat' ? 'mb-3' : 'mb-5'
        }`}
      >
        <h1 className="font-display text-2xl font-medium text-ink">
          Combat Tracker
        </h1>
        {workspace === 'combat' && (
          <div className="grid size-16 shrink-0 content-center justify-items-center border border-line sm:size-20">
            <span className="font-mono text-[10px] tracking-[1px] text-muted">ROUND</span>
            <strong className="font-display text-2xl font-normal text-lime">
              {encounter?.status === 'active' ? encounter.round : '—'}
            </strong>
          </div>
        )}
      </header>
      {(workspace !== 'combat' || storageError) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span
            role={storageError ? 'alert' : 'status'}
            className={`mr-auto font-mono text-[10px] tracking-[.7px] ${
              storageError ? 'text-orange' : 'text-muted'
            }`}
          >
            {storageError || (isHydrated ? 'SAVED LOCALLY' : 'LOADING SAVED DATA')}
          </span>
          {workspace !== 'combat' && (
            <>
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
            </>
          )}
        </div>
      )}
      {workspace !== 'combat' && (
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
      )}
      <section
        className={`grid grid-cols-1 gap-5 ${
          workspace === 'combat'
            ? 'grid-rows-[minmax(0,1fr)] min-h-0 flex-1 items-stretch overflow-hidden'
            : 'items-start'
        }`}
      >
        <div className="space-y-5" hidden={workspace === 'combat'}>
          <div hidden={workspace !== 'parties'}>
            <PartyPage
              parties={parties}
              onCreateParty={createParty}
              onDeleteParty={deleteParty}
              onUpdateParty={updateParty}
            />
          </div>
          <div hidden={workspace !== 'creatures'}>
            <CreaturePage
              creatures={creatures}
              onSaveCreature={saveCreature}
              onDeleteCreature={deleteCreature}
            />
          </div>
          <div hidden={workspace !== 'encounters'}>
            <EncounterPage
              encounters={encounters}
              encounter={encounter}
              selectedEncounterId={effectiveEncounterId}
              creatures={creatures}
              parties={parties}
              isHydrated={isHydrated}
              onCreateDraft={createEncounterDraft}
              onSelectEncounter={(selected) => setSelectedEncounterId(selected.id)}
              onDeleteEncounter={deleteEncounterRecord}
              onDuplicateEncounter={duplicateEncounter}
              onUpdateEncounter={updateEncounter}
              onAddCreatureGroup={addCreatureToEncounter}
              onUpdateCreatureQuantity={updateCreatureQuantity}
              onUpdateGroupInitiative={updateGroupInitiative}
              onRemoveGroup={removeGroup}
              onStartEncounter={beginEncounter}
              onResumeEncounter={resumeEncounter}
            />
          </div>
        </div>
        <div
          className={workspace === 'combat' ? 'min-h-0 overflow-hidden' : ''}
          hidden={workspace !== 'combat'}
        >
          <CombatPage
            encounter={encounter}
            activeCombatantName={activeCombatant?.name}
            onNextTurn={advanceTurn}
            onPause={pauseSelectedEncounter}
            onComplete={finishEncounter}
            onAdjustCreatureHp={adjustCreatureHp}
          />
        </div>
      </section>
      <footer
        className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-mono text-[9px] tracking-[.8px] ${
          workspace === 'combat' ? 'mt-3' : 'mt-8 text-dim'
        }`}
      >
        {workspace === 'combat' ? (
          <Button onClick={() => setWorkspace('encounters')}>
            ← Back to encounters
          </Button>
        ) : (
          <>
            <span>LOCAL SESSION</span>
            <span>NO CLOUD / NO DISTRACTIONS</span>
            <span>COMBAT TRACKER MVP</span>
          </>
        )}
      </footer>
    </main>
  )
}

export default App
