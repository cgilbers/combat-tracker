import { useEffect, useState } from 'react'
import { nextTurn, startEncounter, updateCreatureHp } from './combat/engine'
import { createBackup, loadAppData, parseBackup, restoreBackup, saveAppData } from './data/database'
import type { Character, Creature, Encounter, Party } from './domain/types'

const createId = () => crypto.randomUUID()

const initialParty: Party = {
  id: createId(),
  name: 'The Lantern Company',
  members: [] as Character[],
}

function App() {
  const [party, setParty] = useState(initialParty)
  const [pcName, setPcName] = useState('')
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [creatureName, setCreatureName] = useState('Ash Wyrmling')
  const [creatureAc, setCreatureAc] = useState('13')
  const [creatureHp, setCreatureHp] = useState('18')
  const [creatureDexterity, setCreatureDexterity] = useState('1')
  const [selectedCreatureId, setSelectedCreatureId] = useState('')
  const [creatureQuantity, setCreatureQuantity] = useState('1')
  const [encounterName, setEncounterName] = useState('The Old Watchtower')
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [hpAdjustment, setHpAdjustment] = useState('1')
  const [isHydrated, setIsHydrated] = useState(false)
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    let isCancelled = false

    loadAppData()
      .then((data) => {
        if (isCancelled) return
        if (data.parties[0]) setParty(data.parties[0])
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

    saveAppData({ party, creatures, encounter }).catch(() => {
      setStorageError('Changes could not be saved locally.')
    })
  }, [party, creatures, encounter, isHydrated])

  const addPc = () => {
    const name = pcName.trim()
    if (!name) return

    setParty((currentParty) => ({
      ...currentParty,
      members: [
        ...currentParty.members,
        {
          id: createId(),
          name,
        },
      ],
    }))
    setPcName('')
  }

  const addCreature = () => {
    const name = creatureName.trim()
    const hp = Math.max(Number(creatureHp) || 0, 1)
    if (!name) return

    const creature: Creature = {
      id: createId(),
      source: 'custom',
      name,
      ac: Math.max(Number(creatureAc) || 0, 1),
      hpAverage: hp,
      dexterityModifier: Number(creatureDexterity) || 0,
    }

    setCreatures((currentCreatures) => [...currentCreatures, creature])
    setSelectedCreatureId(creature.id)
  }

  const buildEncounter = () => {
    const creature = creatures.find((item) => item.id === selectedCreatureId)
    if (!creature || party.members.length === 0) return

    const quantity = Math.min(Math.max(Number(creatureQuantity) || 1, 1), 12)
    const pcCombatants = party.members.map((member) => ({
      id: createId(),
      type: 'pc' as const,
      refId: member.id,
      name: member.name,
      initiative: null,
    }))
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
      partyId: party.id,
      combatants: [...pcCombatants, ...creatureCombatants],
      round: 1,
      currentTurnIndex: 0,
      isStarted: false,
    })
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
      setParty(data.parties[0] ?? initialParty)
      setCreatures(data.creatures)
      setEncounter(data.encounters[0] ?? null)
      setStorageError('')
    } catch {
      setStorageError('That file is not a valid combat tracker backup.')
    }
  }

  const activeCombatant = encounter?.combatants[encounter.currentTurnIndex]

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
                <h2>Who is here?</h2>
              </div>
              <span className="count-pill">{party.members.length} PCs</span>
            </div>
            <label>
              Party name
              <input value={party.name} onChange={(event) => setParty({ ...party, name: event.target.value })} />
            </label>
            <div className="inline-form">
              <label>
                Character
                <input placeholder="Mira" value={pcName} onChange={(event) => setPcName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addPc()} />
              </label>
              <button className="icon-button" type="button" onClick={addPc} aria-label="Add character">+</button>
            </div>
            <div className="name-list">
              {party.members.map((member) => <div className="name-row" key={member.id}><span>{member.name}</span><small>initiative set per encounter</small></div>)}
              {party.members.length === 0 && <p className="empty-copy">Add the adventurers who will be acting.</p>}
            </div>
            <p className="helper">Players keep their own HP and AC. This tracker only holds their place in initiative.</p>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="step-label">02 / CREATURE</span>
                <h2>What stands against them?</h2>
              </div>
              <span className="count-pill">{creatures.length} saved</span>
            </div>
            <div className="form-grid">
              <label className="wide-field">Name<input value={creatureName} onChange={(event) => setCreatureName(event.target.value)} /></label>
              <label>AC<input type="number" min="1" value={creatureAc} onChange={(event) => setCreatureAc(event.target.value)} /></label>
              <label>HP<input type="number" min="1" value={creatureHp} onChange={(event) => setCreatureHp(event.target.value)} /></label>
              <label>Dex mod<input type="number" value={creatureDexterity} onChange={(event) => setCreatureDexterity(event.target.value)} /></label>
            </div>
            <button className="text-button" type="button" onClick={addCreature}>Save creature <span>→</span></button>
            {creatures.length > 0 && <label className="select-field">Use creature<select value={selectedCreatureId} onChange={(event) => setSelectedCreatureId(event.target.value)}>{creatures.map((creature) => <option value={creature.id} key={creature.id}>{creature.name} · AC {creature.ac} · {creature.hpAverage} HP</option>)}</select></label>}
          </section>

          <section className="panel builder-panel">
            <div className="panel-heading"><div><span className="step-label">03 / ENCOUNTER</span><h2>Set the scene.</h2></div></div>
            <label>Encounter name<input value={encounterName} onChange={(event) => setEncounterName(event.target.value)} /></label>
            <div className="inline-form">
              <label>Creatures<input type="number" min="1" max="12" value={creatureQuantity} onChange={(event) => setCreatureQuantity(event.target.value)} /></label>
              <button className="primary-button" type="button" onClick={buildEncounter} disabled={!selectedCreatureId || party.members.length === 0}>Build encounter <span>↗</span></button>
            </div>
            {party.members.length === 0 && <p className="warning-copy">Add at least one PC before building an encounter.</p>}
          </section>
        </div>

        <section className={`combat-panel ${encounter?.isStarted ? 'is-live' : ''}`}>
          <div className="combat-header">
            <div><span className="step-label">04 / COMBAT RUN</span><h2>{encounter?.name ?? 'No encounter prepared'}</h2></div>
            {encounter?.isStarted && <span className="live-indicator"><i /> LIVE</span>}
          </div>
          {!encounter && <div className="empty-combat"><div className="compass">✦</div><h3>Your order is waiting.</h3><p>Build an encounter to place the party and creatures on the field.</p></div>}
          {encounter && !encounter.isStarted && <div className="initiative-setup"><p className="section-note">Enter initiative for each combatant, then begin the round.</p>{encounter.combatants.map((combatant) => <div className="initiative-row" key={combatant.id}><div className={`type-mark ${combatant.type}`}>{combatant.type === 'pc' ? 'P' : 'C'}</div><strong>{combatant.name}</strong>{combatant.type === 'pc' && <span className="pc-note">player tracks HP / AC</span>}<input aria-label={`Initiative for ${combatant.name}`} type="number" value={combatant.initiative ?? ''} onChange={(event) => setInitiative(combatant.id, event.target.value)} /></div>)}<button className="start-button" type="button" disabled={encounter.combatants.some((combatant) => combatant.initiative === null)} onClick={() => setEncounter(startEncounter(encounter))}>Begin encounter <span>→</span></button></div>}
          {encounter?.isStarted && <div className="run-view"><div className="active-banner"><span>NOW ACTING</span><strong>{activeCombatant?.name}</strong><button type="button" onClick={() => setEncounter(nextTurn(encounter))}>Next turn <span>→</span></button></div><div className="order-list">{encounter.combatants.map((combatant, index) => <div className={`combatant-row ${index === encounter.currentTurnIndex ? 'active' : ''} ${combatant.isDefeated ? 'defeated' : ''}`} key={combatant.id}><div className={`type-mark ${combatant.type}`}>{combatant.type === 'pc' ? 'P' : 'C'}</div><div className="combatant-name"><strong>{combatant.name}</strong><small>{combatant.type === 'pc' ? 'Player character' : 'Creature'}</small></div><span className="initiative-score">{combatant.initiative}</span>{combatant.type === 'creature' ? <><div className="hp-control"><strong>{combatant.currentHp}</strong><span>/ {combatant.maxHp} HP</span></div><div className="hp-adjustment"><label htmlFor={`hp-adjustment-${combatant.id}`}>Amount</label><input id={`hp-adjustment-${combatant.id}`} type="number" min="1" value={hpAdjustment} onChange={(event) => setHpAdjustment(event.target.value)} /><button className="damage-button" type="button" onClick={() => adjustCreatureHp(combatant.id, 'damage')}>Damage</button><button className="heal-button" type="button" onClick={() => adjustCreatureHp(combatant.id, 'heal')}>Heal</button></div><span className="ac-score">AC {combatant.ac}</span></> : <span className="pc-note">HP / AC at table</span>}</div>)}</div></div>}
        </section>
      </section>
      <footer><span>LOCAL SESSION</span><span>NO CLOUD / NO DISTRACTIONS</span><span>COMBAT TRACKER MVP</span></footer>
    </main>
  )
}

export default App
