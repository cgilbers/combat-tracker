import { useEffect, useState, type ChangeEvent } from 'react'
import { Moon, Sun } from 'lucide-react'
import {
  adjustBossResource,
  activateEncounter,
  addCreatureGroup,
  completeEncounter,
  createDraftEncounter,
  delayCombatant,
  duplicateEncounter as duplicateEncounterRecord,
  nextTurn,
  pauseEncounter,
  resumeCombatant,
  rollAllCreatureGroupInitiatives,
  rollCreatureGroupInitiative,
  removeCreatureGroup,
  startEncounter,
  updateCreatureGroup,
  updateCreatureHp,
} from './combat/engine'
import type { BossResourceKind, ResourceAdjustment } from './combat/engine'
import { Button } from './components/Button'
import { useAppData } from './data/useAppData'
import type { Encounter, Party } from './domain/types'
import { CombatPage } from './pages/CombatPage'
import { CreaturePage } from './pages/CreaturePage'
import { EncounterPage } from './pages/EncounterPage'
import { PartyPage } from './pages/PartyPage'

type Workspace = 'parties' | 'creatures' | 'encounters' | 'combat'
type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'combat-tracker-theme'
const createId = () => crypto.randomUUID()

function App() {
  const [workspace, setWorkspace] = useState<Workspace>('encounters')
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark',
  )
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const [isReinforcementsOpen, setIsReinforcementsOpen] = useState(false)
  const [reinforcementCreatureId, setReinforcementCreatureId] = useState('')
  const [reinforcementQuantity, setReinforcementQuantity] = useState('1')
  const [reinforcementInitiative, setReinforcementInitiative] = useState('')
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
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

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
    if (!encounter || (encounter.status !== 'draft' && encounter.status !== 'active') || !creature) return
    updateEncounter(addCreatureGroup(encounter, creature, quantity, createId))
  }

  const addCreatureToActiveEncounter = (
    creatureId: string,
    quantity: number,
    initiativeValue: string,
  ) => {
    const creature = creatures.find((item) => item.id === creatureId)
    if (!encounter || encounter.status !== 'active' || !creature) return
    const initiative = initiativeValue.trim() === '' ? null : Number(initiativeValue)
    updateEncounter(
      addCreatureGroup(
        encounter,
        creature,
        quantity,
        createId,
        Number.isFinite(initiative) ? initiative : null,
      ),
    )
    setIsReinforcementsOpen(false)
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

  const rollGroupInitiative = (groupId: string) => {
    if (encounter) updateEncounter(rollCreatureGroupInitiative(encounter, groupId))
  }

  const rollAllGroupInitiatives = () => {
    if (encounter) updateEncounter(rollAllCreatureGroupInitiatives(encounter))
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

  const openCreatureLibraryForReinforcements = () => {
    if (encounter?.status === 'active') pauseSelectedEncounter()
    setIsReinforcementsOpen(false)
    setWorkspace('creatures')
  }

  const finishEncounter = () => {
    if (encounter) updateEncounter(completeEncounter(encounter))
  }

  const advanceTurn = () => {
    if (encounter) updateEncounter(nextTurn(encounter))
  }

  const delayCurrentTurn = (combatantId: string) => {
    if (encounter) updateEncounter(delayCombatant(encounter, combatantId))
  }

  const resumeDelayedTurn = (combatantId: string) => {
    if (encounter) {
      updateEncounter(resumeCombatant(encounter, combatantId))
    }
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

  const adjustEncounterBossResource = (
    combatantId: string,
    resource: BossResourceKind,
    direction: ResourceAdjustment,
    spellSlotLevel?: number,
  ) => {
    if (!encounter) return
    updateEncounter(
      adjustBossResource(
        encounter,
        combatantId,
        resource,
        direction,
        spellSlotLevel,
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
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-display text-2xl font-medium text-ink">
            {workspace === 'combat' ? encounter?.name ?? 'Combat Tracker' : 'Combat Tracker'}
          </h1>
          {workspace === 'combat' && encounter?.status === 'active' && (
            <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[1px] text-accent">
              <i className="size-2 rounded-full bg-accent" /> LIVE
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {workspace === 'combat' && encounter?.status === 'active' && (
            <div className="relative flex items-center gap-2">
              <Button
                variant="secondary"
                aria-label="Open reinforcements"
                title="Reinforcements"
                className="grid size-10 pl-2 place-items-center rounded-md border border-accent bg-accent-soft text-accent transition-colors hover:bg-accent/20 sm:size-12"
                onClick={() => setIsReinforcementsOpen((open) => !open)}
              >
                <svg
                  aria-hidden="true"
                  className="size-7 shrink-0 sm:size-8"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="10 8 120 120"
                  fill="currentColor"
                >
                  <path d="M18.12 25.99c4.95 2.12 8.26 5.22 13.96 5.96c10.67 1.99 21.48 5.93 30.28 12.46c4.22 0.17 5.08 -0.49 8.46 -2.72c3.38 -2.12 4.38 -1.74 7.93 -0.34c3.19 4.39 4.31 7.71 9.43 10.53c5.04 2.74 5.04 6.98 4.89 12.16c3.41 3.83 7.03 7.62 10.32 11.53c2.31 -1.18 3.48 -4.24 3.69 -6.71l0.75 0.37c1.22 3.05 1.46 6.54 0.91 9.86c4.74 3.01 4.82 5.55 4.28 10.84c-3.33 5.24 -7.67 7.21 -13.77 7.03c1.51 -2.1 3.54 -4.14 4.88 -6.22c-2.74 1.53 -5.81 2.35 -8.97 2.17c1.73 -1.95 3.16 -4.1 4.98 -5.98c-3.33 1.19 -5.43 2.07 -9.02 1.95c1.27 -1.72 3.23 -3.45 3.99 -5.41c-3.02 0.88 -4.89 1.32 -8.03 1.38c1.3 -1.63 2.67 -3.1 3.77 -4.88c-1.47 -0.27 -6.17 0.91 -7.92 0.94c1.36 -1.51 2.51 -3.07 3.72 -4.7c-0.82 -0.61 -1.3 -1.23 -2.31 -1.57c-4.39 -1.86 -7.11 -1.83 -11.44 -0.33c0.52 0.72 1.08 1.41 1.64 2.1c1.99 2.4 2.87 5.31 4.61 7.75l1.88 -1.35c-0.27 1.97 0.65 3.29 -0.91 4.78c1.28 0.73 0.72 0.47 1.17 2.16c1.3 -0.95 2.47 -2.05 3.82 -2.94l-0.1 3.12c-0.44 2.07 -1.49 1.09 -0.81 4.14c2.3 -0.48 2.93 -2.19 4.94 -3.12c0.63 2.84 -1.51 4.52 -0.94 6.96c2.43 -0.07 2.82 -2.02 4.93 -2.86c0.68 3.26 -1.81 3.82 0 6.66c-1.22 2.51 -3.44 3.29 -6.13 3.34c-3.22 -0.18 -6.47 2.18 -10 2.04c0.74 -1.52 2.65 -2.68 3.09 -4.04l0.1 -0.78l-0.88 -0.4c-1.55 -1.57 -2.69 -3.39 -4.12 -5.04c-3.44 -3.39 -6.05 -8.68 -11.67 -7.89c-2.43 1.54 -4.91 4.78 -8.03 3.84c-0.76 -0.69 -1.49 -1.27 -2.36 -1.82c-7.71 -5.36 -15.38 -10.96 -23.15 -16.21c-0.16 -1.56 0.13 -2.19 -0.79 -3.55c1.48 0.1 2.82 0.11 4.28 0.41c-1.63 -3.76 -2.72 -3.93 -5.66 -6.24c2.63 -1.61 5.63 -2.65 8.6 -3.45l3.67 0.08c-1.59 -2.67 -4.15 -4.2 -5.91 -6.57c2.69 -0.89 4.74 -1.86 7.69 -1.65c1.44 0.04 2.37 0.47 3.85 0c0.72 -3.04 -0.42 -4.45 -2 -6.81c5.3 0.39 5.29 1.69 7.43 5.63c1.29 0.06 2.58 -0.02 3.88 0c-1.15 -6.63 -7.35 -9.1 -12.79 -11.84c-7.55 -3.64 -16.97 -4.81 -22.53 -11.61c-1.03 -0.83 -0.91 -2.07 -1.58 -3.16zM46.35 57.37l0.18 1.36c4.44 -0.13 7.6 2.04 11.14 4.43c2.05 -2 2.13 -3.46 1.23 -6.14c-2.97 0.11 -9.77 -1.06 -11.89 1.03l-0.66 -0.68zM83.68 61c-1.47 -0.18 -3.04 -0.19 -4.51 -0.09c-1.85 0.18 -2.08 0.02 -2.52 1.06l-1.81 0.02l0.28 0.72c2.85 3.32 8.04 3.63 12.08 4.09c-0.41 -2.37 -1.97 -4.05 -3.52 -5.8zM57.07 68.78c-1.12 -2.43 -1.31 -4.98 -4.79 -3.4c-2.93 1.67 -6.84 3.42 -7.99 6.87c1.72 0.11 1.54 -1.23 3.01 -1.1c3.28 -1.17 4.86 -1.1 8.36 -0.82l1.41 -1.55zM52.66 74.48c-2.66 2.12 -5.88 4.99 -5.79 8.64c2.86 -3.02 4.58 -3.49 8.4 -4.65l-0.15 -2.56c-0.77 -0.64 -1.59 -0.95 -2.46 -1.43z" />
                  <path d="M24.15 82.64c1.95 -0.07 3.9 -0.04 5.85 -0.02l0 9.48c3.25 0.03 6.51 -0.03 9.76 0.03c-0.05 1.97 -0.03 3.94 -0.01 5.91l-9.74 -0.01c-0.04 3.27 0.04 6.54 -0.05 9.8c-1.93 -0.07 -3.85 -0.03 -5.78 -0.03l0 -9.77l-9.58 0.01c-0.02 -1.99 -0.04 -3.98 0.02 -5.96c3.17 0.06 6.37 0.01 9.55 0.02c0 -3.14 0.05 -6.31 -0.02 -9.46z" />
                  <path d="M34.64 20.38c3.58 1.34 6.28 4.67 10.42 5.57c6.78 1.47 12.93 2.55 19.32 5.57c2.91 1.44 6.13 2.95 8.37 5.31c-2.99 -0.07 -4.51 1.99 -7.01 3.26c-6.21 -5.72 -13.91 -7.29 -21.49 -10.3c-3.56 -1.46 -9.14 -5.31 -9.61 -9.41z" />
                </svg>

              </Button>
              {isReinforcementsOpen && encounter?.status === 'active' && (
                <div className="absolute right-0 top-full z-20 mt-2 w-[20rem] rounded-md border border-line bg-raised p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-mono text-[10px] tracking-[1px] text-muted">REINFORCEMENTS</h3>
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-[10px]"
                      onClick={() => {
                        const selected = creatures.find((creature) => creature.id === reinforcementCreatureId) ?? creatures[0]
                        if (!selected) return
                        setReinforcementCreatureId(selected.id)
                        setReinforcementInitiative(
                          String(
                            Math.floor(Math.random() * 20) + 1 + selected.dexterityModifier,
                          ),
                        )
                      }}
                    >
                      Roll init
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <label className="flex flex-col gap-2 font-mono text-[11px] tracking-[.3px] text-muted uppercase">
                      Saved creature
                      <select
                        value={reinforcementCreatureId}
                        onChange={(event) => setReinforcementCreatureId(event.target.value)}
                        className="w-full rounded-md border border-line bg-input px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
                      >
                        <option value="">Choose a saved creature</option>
                        {creatures.map((creature) => (
                          <option key={creature.id} value={creature.id}>
                            {creature.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-[1fr_7rem] gap-3">
                      <label className="flex flex-col gap-2 font-mono text-[11px] tracking-[.3px] text-muted uppercase">
                        Quantity
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={reinforcementQuantity}
                          onChange={(event) => setReinforcementQuantity(event.target.value)}
                          className="w-full rounded-md border border-line bg-input px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
                        />
                      </label>
                      <label className="flex flex-col gap-2 font-mono text-[11px] tracking-[.3px] text-muted uppercase">
                        Init
                        <input
                          type="number"
                          value={reinforcementInitiative}
                          onChange={(event) => setReinforcementInitiative(event.target.value)}
                          placeholder="Opt"
                          className="w-full rounded-md border border-line bg-input px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
                        />
                      </label>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full"
                      disabled={!reinforcementCreatureId}
                      onClick={() => {
                        if (!reinforcementCreatureId) return
                        addCreatureToActiveEncounter(
                          reinforcementCreatureId,
                          Number(reinforcementQuantity) || 1,
                          reinforcementInitiative,
                        )
                      }}
                    >
                      Add to encounter
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={openCreatureLibraryForReinforcements}
                    >
                      Add a new creature
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid size-16 content-center justify-items-center border border-line sm:size-20">
                <span className="font-mono text-[10px] tracking-[1px] text-muted">ROUND</span>
                <strong className="font-display text-2xl font-normal text-accent">
                  {encounter?.status === 'active' ? encounter.round : '—'}
                </strong>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
      </header>
      {(workspace !== 'combat' || storageError) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span
            role={storageError ? 'alert' : 'status'}
            className={`mr-auto font-mono text-[10px] tracking-[.7px] ${
              storageError ? 'text-danger' : 'text-muted'
            }`}
          >
            {storageError || (isHydrated ? 'SAVED LOCALLY' : 'LOADING SAVED DATA')}
          </span>
          {workspace !== 'combat' && (
            <>
              <Button onClick={exportData} disabled={!isHydrated}>Export JSON</Button>
              <label className="cursor-pointer rounded-md border border-line bg-transparent px-3 py-2 font-sans text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent">
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
              onRollGroupInitiative={rollGroupInitiative}
              onRollAllGroupInitiatives={rollAllGroupInitiatives}
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
            activeCombatantInitiative={activeCombatant?.initiative}
            onNextTurn={advanceTurn}
            onDelayTurn={delayCurrentTurn}
            onResumeTurn={resumeDelayedTurn}
            onAdjustCreatureHp={adjustCreatureHp}
            onAdjustBossResource={adjustEncounterBossResource}
          />
        </div>
      </section>
      <footer
        className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-mono text-[9px] tracking-[.8px] ${
          workspace === 'combat' ? 'mt-3' : 'mt-8 text-dim'
        }`}
      >
        {workspace === 'combat' ? (
          <>
            <Button onClick={() => setWorkspace('encounters')}>
              ← Back to encounters
            </Button>
            <div className="flex flex-wrap gap-2">
              {encounter?.status === 'active' && (
                <>
                  <Button onClick={pauseSelectedEncounter}>Pause</Button>
                  <Button variant="danger" onClick={finishEncounter}>
                    Complete
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <span>COMBAT TRACKER MVP</span>
            <span>by cgilbers</span>
          </>
        )}
      </footer>
    </main>
  )
}

export default App
