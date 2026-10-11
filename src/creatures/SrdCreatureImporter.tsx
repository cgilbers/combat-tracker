import { useState } from 'react'
import {
  importSrdCreature,
  loadSrdCatalog,
  SRD_ATTRIBUTION,
  type SrdMonsterSummary,
} from '../data/srd'
import type { Creature } from '../domain/types'

type CatalogStatus = 'idle' | 'loading' | 'success' | 'cache' | 'network-error'

type SrdCreatureImporterProps = {
  creatures: Creature[]
  onImportCreature: (creature: Creature) => Promise<void>
}

export function SrdCreatureImporter({
  creatures,
  onImportCreature,
}: SrdCreatureImporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>('idle')
  const [catalog, setCatalog] = useState<SrdMonsterSummary[]>([])
  const [search, setSearch] = useState('')
  const [importingIndex, setImportingIndex] = useState('')
  const [failedIndex, setFailedIndex] = useState('')
  const [importError, setImportError] = useState('')
  const [importMessage, setImportMessage] = useState('')

  const refreshCatalog = async () => {
    setCatalogStatus('loading')
    setImportError('')
    const result = await loadSrdCatalog()
    setCatalog(result.creatures)
    setCatalogStatus(result.status)
    if (result.status === 'network-error') {
      setImportError('The SRD catalog could not be loaded. Check your connection and retry.')
    }
  }

  const openCatalog = () => {
    setIsOpen(true)
    if (catalogStatus === 'idle') void refreshCatalog()
  }

  const matchingCreatures = catalog.filter((creature) =>
    creature.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )

  const importCreature = async (summary: SrdMonsterSummary) => {
    setImportingIndex(summary.index)
    setFailedIndex('')
    setImportError('')
    setImportMessage('')
    try {
      const result = await importSrdCreature(summary.index)
      if (result.status === 'network-error') {
        setFailedIndex(summary.index)
        setImportError(`${summary.name} could not be imported. Check your connection and retry.`)
        return
      }

      await onImportCreature(result.creature)
      setFailedIndex('')
      setImportMessage(
        result.status === 'cache'
          ? `${summary.name} was added from the offline cache.`
          : `${summary.name} was imported and saved locally.`,
      )
    } catch {
      setFailedIndex(summary.index)
      setImportError(`${summary.name} was fetched but could not be saved locally. Please retry.`)
    } finally {
      setImportingIndex('')
    }
  }

  const importedIds = new Set(
    creatures.filter((creature) => creature.source === 'srd').map((creature) => creature.id),
  )

  return (
    <section className="srd-importer" aria-label="SRD creature import">
      {!isOpen ? (
        <button className="backup-button" type="button" onClick={openCatalog}>
          Browse SRD creatures
        </button>
      ) : (
        <div className="srd-importer-content">
          <div className="srd-importer-heading">
            <div>
              <strong>Import from the SRD</strong>
              <p className="helper">
                Search the catalog, then import a creature to keep its stat block available offline.
              </p>
            </div>
            <button className="text-button" type="button" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>

          {catalogStatus === 'loading' && (
            <p role="status" className="section-note">Loading SRD catalog…</p>
          )}
          {catalogStatus === 'network-error' && (
            <div className="srd-status" role="alert">
              <p>{importError}</p>
              <button className="backup-button" type="button" onClick={() => void refreshCatalog()}>
                Retry catalog
              </button>
            </div>
          )}
          {catalogStatus === 'cache' && (
            <p role="status" className="srd-cache-note">
              Offline catalog cache · {catalog.length} creatures listed. Only imported stat blocks are available offline.
            </p>
          )}
          {catalogStatus === 'success' && (
            <p role="status" className="srd-cache-note">
              Catalog loaded · {catalog.length} SRD creatures available.
            </p>
          )}

          {catalog.length > 0 && (
            <>
              <label className="srd-search-field">
                Search creatures by name
                <input
                  aria-label="Search SRD creatures"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Goblin"
                />
              </label>
              {search.trim() && (
                <div className="srd-results" aria-label="SRD search results">
                  {matchingCreatures.length === 0 ? (
                    <p className="empty-copy">No SRD creatures match that name.</p>
                  ) : (
                    matchingCreatures.slice(0, 20).map((summary) => {
                      const creatureId = `srd:${summary.index}`
                      const isImported = importedIds.has(creatureId)
                      const isImporting = importingIndex === summary.index
                      return (
                        <div className="srd-result" key={summary.index}>
                          <span>{summary.name}</span>
                          <button
                            className="backup-button"
                            type="button"
                            disabled={isImported || Boolean(importingIndex)}
                            onClick={() => void importCreature(summary)}
                          >
                            {isImporting
                              ? 'Importing…'
                              : isImported
                                ? 'Imported'
                                : failedIndex === summary.index
                                  ? 'Retry'
                                  : 'Import'}
                          </button>
                        </div>
                      )
                    })
                  )}
                  {matchingCreatures.length > 20 && (
                    <p className="empty-copy">Showing the first 20 matches. Refine your search to see others.</p>
                  )}
                </div>
              )}
            </>
          )}
          {importError && catalogStatus !== 'network-error' && (
            <p role="alert" className="warning-copy">{importError}</p>
          )}
          {importMessage && <p role="status" className="srd-cache-note">{importMessage}</p>}
          <p className="srd-attribution">{SRD_ATTRIBUTION}</p>
        </div>
      )}
    </section>
  )
}
