import { useEffect, useState } from 'react'
import {
  createBackup,
  deleteCreature as deleteSavedCreature,
  deleteEncounter as deleteSavedEncounter,
  deleteParty as deleteSavedParty,
  loadAppData,
  parseBackup,
  restoreBackup,
  saveAppData,
  saveCreature as saveSavedCreature,
  saveParty as saveSavedParty,
} from './database'
import type { Creature, Encounter, Party } from '../domain/types'

type TrackerDataSnapshot = {
  parties: Party[]
  creatures: Creature[]
  encounters: Encounter[]
}

export function useAppData() {
  const [parties, setParties] = useState<Party[]>([])
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [storageError, setStorageError] = useState('')

  useEffect(() => {
    let isCancelled = false

    loadAppData()
      .then((data) => {
        if (isCancelled) return
        setParties(data.parties)
        setCreatures(data.creatures)
        setEncounters(data.encounters)
      })
      .catch(() => {
        if (!isCancelled) {
          setStorageError('Saved data could not be loaded. You can continue in memory.')
        }
      })
      .finally(() => {
        if (!isCancelled) setIsHydrated(true)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated || encounters.length === 0) return

    saveAppData({ encounters })
      .then(() => setStorageError(''))
      .catch(() => {
        setStorageError('Encounter changes could not be saved locally.')
      })
  }, [encounters, isHydrated])

  const createParty = () => {
    const party: Party = {
      id: crypto.randomUUID(),
      name: `New party ${parties.length + 1}`,
      members: [],
    }
    setParties((currentParties) => [...currentParties, party])
    saveSavedParty(party).catch(() => {
      setStorageError('Party changes could not be saved locally.')
    })
    return party
  }

  const updateParty = (party: Party) => {
    setParties((currentParties) =>
      currentParties.map((item) => (item.id === party.id ? party : item)),
    )
    saveSavedParty(party).catch(() => {
      setStorageError('Party changes could not be saved locally.')
    })
  }

  const deleteParty = async (partyId: string) => {
    setParties((currentParties) =>
      currentParties.filter((party) => party.id !== partyId),
    )
    try {
      await deleteSavedParty(partyId)
      setStorageError('')
    } catch {
      setStorageError('Party could not be deleted from local storage.')
    }
  }

  const saveCreature = async (creature: Creature) => {
    try {
      await saveSavedCreature(creature)
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

  const deleteCreature = async (creatureId: string) => {
    try {
      await deleteSavedCreature(creatureId)
      setCreatures((currentCreatures) =>
        currentCreatures.filter((creature) => creature.id !== creatureId),
      )
      setStorageError('')
    } catch (error) {
      setStorageError('Creature could not be deleted from local storage.')
      throw error
    }
  }

  const updateEncounters = (update: (currentEncounters: Encounter[]) => Encounter[]) => {
    setEncounters(update)
  }

  const deleteEncounter = async (encounterId: string): Promise<boolean> => {
    try {
      await deleteSavedEncounter(encounterId)
      setEncounters((currentEncounters) =>
        currentEncounters.filter((encounter) => encounter.id !== encounterId),
      )
      setStorageError('')
      return true
    } catch {
      setStorageError('Saved encounter could not be deleted locally.')
      return false
    }
  }

  const exportBackup = () => createBackup()

  const importBackup = async (json: string): Promise<TrackerDataSnapshot> => {
    await restoreBackup(parseBackup(json))
    const data = await loadAppData()
    setParties(data.parties)
    setCreatures(data.creatures)
    setEncounters(data.encounters)
    setStorageError('')
    return data
  }

  return {
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
  }
}
