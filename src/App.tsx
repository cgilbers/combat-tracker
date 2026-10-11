import { useEffect, useState } from 'react'
import { nextTurn, startEncounter, updateCreatureHp } from './combat/engine'
import { CreatureLibrary } from './creatures/CreatureLibrary'
import {
  createBackup,
  deleteCreature,
  deleteParty,
  loadAppData,
  parseBackup,
  restoreBackup,
  saveCreature,
  saveParty,
  saveAppData,
} from './data/database'
import type { Creature, Encounter, Party } from './domain/types'

const createId = () => crypto.randomUUID()

function App() {
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
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [hpAdjustment, setHpAdjustment] = useState('1')
  const [isHydrated, setIsHydrated] = useState(false)
  const [storageError, setStorageError] = useState('')
  const party = parties.find((item) => item.id === selectedPartyId) ?? null
  const launchParty = parties.find((item) => item.id === launchPartyId) ?? null

  useEffect(() => {
    let isCancelled = false

    loadAppData()
      .then((data) => {
        if (isCancelled) return
        setParties(data.parties)
        setSelectedPartyId(data.parties[0]?.id ?? '')
        setLaunchPartyId(data.parties[0]?.id ?? '')
        setCreatures(data.creatures)
        setEncounter(data.encounters[0] ?? null)
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

    saveAppData({ encounter }).catch(() => {
      setStorageError('Changes could not be saved locally.')
    })
  }, [encounter, isHydrated])

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

  const buildEncounter = () => {
    const creature = creatures.find((item) => item.id === selectedCreatureId)
    if (!creature) return

    const quantity = Math.min(Math.max(Number(creatureQuantity) || 1, 1), 12)
    const creatureCombatants = Array.from({ length: quantity }, (_, index) => ({
      id: createId(),
      type: 'creature' as const,
      refId: creature.id,
      name: quantity > 1 ? `${creature.name} ${index + 1}` : creature.name,
      initiative: null,
      currentHp: creature.hpAverage,
      maxHp: creature.hpAverage,
      ac: creature.ac,
    }))

    setEncounter({
      id: createId(),
      name: encounterName.trim() || 'Unnamed encounter',
      combatants: creatureCombatants,
      round: 1,
      currentTurnIndex: 0,
      isStarted: false,
    })
    setPcInitiatives({})
  }

  const setInitiative = (combatantId: string, value: string) => {
    setEncounter((currentEncounter) => {
      if (!currentEncounter) return currentEncounter
      return {
        ...currentEncounter,
        combatants: currentEncounter.combatants.map((combatant) =>
          combatant.id === combatantId
            ? { ...combatant, initiative: value === '' ? null : Number(value) }
            : combatant,
        ),
      }
    })
  }

  const beginEncounter = () => {
    if (!encounter || !launchParty) return

    setEncounter(
      startEncounter(
        encounter,
        launchParty,
        Object.fromEntries(
          launchParty.members.map((member) => [
            member.id,
            Number(pcInitiatives[member.id]),
          ]),
        ),
        createId,
      ),
    )
  }

  const adjustCreatureHp = (combatantId: string, direction: 'damage' | 'heal') => {
    const amount = Math.abs(Number(hpAdjustment) || 0)
    if (amount === 0) return

    setEncounter((currentEncounter) => {
      if (!currentEncounter) return currentEncounter
      return updateCreatureHp(
        currentEncounter,
        combatantId,
        direction === 'damage' ? -amount : amount,
      )
    })
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
      setEncounter(data.encounters[0] ?? null)
      setStorageError('')
    } catch {
      setStorageError('That file is not a valid combat tracker backup.')
    }
  }

  const activeCombatant = encounter?.combatants[encounter.currentTurnIndex]
  const canBeginEncounter = Boolean(
    encounter &&
      encounter.combatants.length > 0 &&
      encounter.combatants.every((combatant) => combatant.initiative !== null) &&
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
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">FIELD NOTES / 01</p>
          <h1>Initiative, at a glance.</h1>
          <p className="lede">A quiet command deck for the messy middle of a fight.</p>
        </div>
        <div className="round-badge">
          <span>ROUND</span>
          <strong>{encounter?.round ?? '—'}</strong>
        </div>
      </header>
      <div className="app-tools">
        <span className={storageError ? 'storage-status error' : 'storage-status'}>{storageError || (isHydrated ? 'SAVED LOCALLY' : 'LOADING SAVED DATA')}</span>
        <button className="backup-button" type="button" onClick={exportData} disabled={!isHydrated}>Export JSON</button>
        <label className="backup-button file-button">Import JSON<input type="file" accept="application/json,.json" onChange={importData} disabled={!isHydrated} /></label>
      </div>

      <section className="workspace">
        <div className="setup-column">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="step-label">01 / PARTY</span>
                <h2>Who is adventuring?</h2>
              </div>
              <span className="count-pill">{party?.members.length ?? 0} PCs</span>
            </div>
            <div className="party-select-actions">
              <label>
                Select party
                <select
                  aria-label="Select party to manage"
                  value={selectedPartyId}
                  onChange={(event) => setSelectedPartyId(event.target.value)}
                >
                  <option value="">No party selected</option>
                  {parties.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <button className="backup-button" type="button" onClick={createParty}>
                New party
              </button>
            </div>
            {party && (
              <>
                <label className="party-name-field">
                  Party name
                  <input
                    aria-label="Party name"
                    value={party.name}
                    onChange={(event) =>
                      updateSelectedParty((currentParty) => ({
                        ...currentParty,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="inline-form">
                  <label>
                    Character name
                    <input
                      placeholder="Mira"
                      value={pcName}
                      onChange={(event) => setPcName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && addPc()}
                    />
                  </label>
                  <label>
                    Notes
                    <input
                      placeholder="Class, level, or other notes"
                      value={pcNotes}
                      onChange={(event) => setPcNotes(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && addPc()}
                    />
                  </label>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={addPc}
                    aria-label="Add character"
                  >
                    +
                  </button>
                </div>
                <div className="name-list">
                  {party.members.map((member) => (
                    <div className="party-member-row" key={member.id}>
                      <label>
                        Character name
                        <input
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
                      </label>
                      <label>
                        Notes
                        <input
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
                      </label>
                      <button
                        className="text-button remove-party-member"
                        type="button"
                        onClick={() => removePc(member.id)}
                        aria-label={`Remove ${member.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {party.members.length === 0 && (
                    <p className="empty-copy">Add the adventurers who will be acting.</p>
                  )}
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={removeParty}
                >
                  Delete party
                </button>
              </>
            )}
            {!party && <p className="empty-copy">Create a party to manage its PCs.</p>}
            <p className="helper">
              Players keep their own HP and AC. This tracker only holds their place in initiative.
            </p>
          </section>

          <CreatureLibrary
            creatures={creatures}
            selectedCreatureId={selectedCreatureId}
            onSelectCreature={setSelectedCreatureId}
            onSaveCreature={persistCreature}
            onDeleteCreature={removeCreature}
          />

          <section className="panel builder-panel">
            <div className="panel-heading"><div><span className="step-label">03 / ENCOUNTER</span><h2>Set the scene.</h2></div></div>
            <label>Encounter name<input value={encounterName} onChange={(event) => setEncounterName(event.target.value)} /></label>
            <div className="inline-form">
              <label>Creatures<input type="number" min="1" max="12" value={creatureQuantity} onChange={(event) => setCreatureQuantity(event.target.value)} /></label>
              <button className="primary-button" type="button" onClick={buildEncounter} disabled={!selectedCreatureId}>Build encounter <span>↗</span></button>
            </div>
            <p className="helper">Choose a party when you are ready to begin combat; saved encounter setup stays independent.</p>
          </section>
        </div>

        <section className={`combat-panel ${encounter?.isStarted ? 'is-live' : ''}`}>
          <div className="combat-header">
            <div><span className="step-label">04 / COMBAT RUN</span><h2>{encounter?.name ?? 'No encounter prepared'}</h2></div>
            {encounter?.isStarted && <span className="live-indicator"><i /> LIVE</span>}
          </div>
          {!encounter && <div className="empty-combat"><div className="compass">✦</div><h3>Your order is waiting.</h3><p>Build an encounter to place the party and creatures on the field.</p></div>}
          {encounter && !encounter.isStarted && (
            <div className="initiative-setup">
              <p className="section-note">Set creature initiative, choose a party, and enter PC initiative to begin.</p>
              {encounter.combatants.map((combatant) => (
                <div className="initiative-row" key={combatant.id}>
                  <div className="type-mark creature">C</div>
                  <strong>{combatant.name}</strong>
                  <input
                    aria-label={`Initiative for ${combatant.name}`}
                    type="number"
                    value={combatant.initiative ?? ''}
                    onChange={(event) => setInitiative(combatant.id, event.target.value)}
                  />
                </div>
              ))}
              <label className="select-field">
                Party for this encounter
                <select
                  aria-label="Party for this encounter"
                  value={launchPartyId}
                  onChange={(event) => {
                    setLaunchPartyId(event.target.value)
                    setPcInitiatives({})
                  }}
                >
                  <option value="">Choose a party</option>
                  {parties.map((item) => (
                    <option value={item.id} key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              {launchParty?.members.map((member) => (
                <div className="initiative-row" key={member.id}>
                  <div className="type-mark pc">P</div>
                  <strong>{member.name}</strong>
                  <span className="pc-note">HP / AC at table</span>
                  <input
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
                <p className="warning-copy">Add at least one PC to this party before beginning.</p>
              )}
              <button
                className="start-button"
                type="button"
                disabled={!canBeginEncounter}
                onClick={beginEncounter}
              >
                Begin encounter <span>→</span>
              </button>
            </div>
          )}
          {encounter?.isStarted && <div className="run-view"><div className="active-banner"><span>NOW ACTING</span><strong>{activeCombatant?.name}</strong><button type="button" onClick={() => setEncounter(nextTurn(encounter))}>Next turn <span>→</span></button></div><div className="order-list">{encounter.combatants.map((combatant, index) => <div className={`combatant-row ${index === encounter.currentTurnIndex ? 'active' : ''} ${combatant.isDefeated ? 'defeated' : ''}`} key={combatant.id}><div className={`type-mark ${combatant.type}`}>{combatant.type === 'pc' ? 'P' : 'C'}</div><div className="combatant-name"><strong>{combatant.name}</strong><small>{combatant.type === 'pc' ? 'Player character' : 'Creature'}</small></div><span className="initiative-score">{combatant.initiative}</span>{combatant.type === 'creature' ? <><div className="hp-control"><strong>{combatant.currentHp}</strong><span>/ {combatant.maxHp} HP</span></div><div className="hp-adjustment"><label htmlFor={`hp-adjustment-${combatant.id}`}>Amount</label><input id={`hp-adjustment-${combatant.id}`} type="number" min="1" value={hpAdjustment} onChange={(event) => setHpAdjustment(event.target.value)} /><button className="damage-button" type="button" onClick={() => adjustCreatureHp(combatant.id, 'damage')}>Damage</button><button className="heal-button" type="button" onClick={() => adjustCreatureHp(combatant.id, 'heal')}>Heal</button></div><span className="ac-score">AC {combatant.ac}</span></> : <span className="pc-note">HP / AC at table</span>}</div>)}</div></div>}
        </section>
      </section>
      <footer><span>LOCAL SESSION</span><span>NO CLOUD / NO DISTRACTIONS</span><span>COMBAT TRACKER MVP</span></footer>
    </main>
  )
}

export default App
