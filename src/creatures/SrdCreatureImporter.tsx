import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
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
    <section className="mt-4 border-t border-line pt-4" aria-label="SRD creature import">
      {!isOpen ? (
        <Button onClick={openCatalog}>
          Browse SRD creatures
        </Button>
      ) : (
        <Panel as="div" variant="builder" className="p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <strong className="font-display text-lg font-medium text-ink">Import from the SRD</strong>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Search the catalog, then import a creature to keep its stat block available offline.
              </p>
            </div>
            <Button variant="ghost" className="shrink-0" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>

          {catalogStatus === 'loading' && (
            <p role="status" className="mb-3 text-sm text-muted">Loading SRD catalog…</p>
          )}
          {catalogStatus === 'network-error' && (
            <div className="mb-3 border border-orange/40 bg-orange/10 p-3" role="alert">
              <p className="mb-3 text-sm text-orange">{importError}</p>
              <Button onClick={() => void refreshCatalog()}>
                Retry catalog
              </Button>
            </div>
          )}
          {catalogStatus === 'cache' && (
            <p role="status" className="mb-3 border border-line bg-[#161a18] p-3 text-xs leading-relaxed text-muted">
              Offline catalog cache · {catalog.length} creatures listed. Only imported stat blocks are available offline.
            </p>
          )}
          {catalogStatus === 'success' && (
            <p role="status" className="mb-3 border border-line bg-[#161a18] p-3 text-xs leading-relaxed text-muted">
              Catalog loaded · {catalog.length} SRD creatures available.
            </p>
          )}

          {catalog.length > 0 && (
            <>
              <FieldLabel className="mb-3">
                Search creatures by name
                <TextInput
                  aria-label="Search SRD creatures"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Goblin"
                />
              </FieldLabel>
              {search.trim() && (
                <div className="max-h-72 overflow-y-auto border border-line" aria-label="SRD search results">
                  {matchingCreatures.length === 0 ? (
                    <p className="p-3 text-sm text-muted">No SRD creatures match that name.</p>
                  ) : (
                    matchingCreatures.slice(0, 20).map((summary) => {
                      const creatureId = `srd:${summary.index}`
                      const isImported = importedIds.has(creatureId)
                      const isImporting = importingIndex === summary.index
                      return (
                        <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0" key={summary.index}>
                          <span className="text-sm text-ink">{summary.name}</span>
                          <Button
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
                          </Button>
                        </div>
                      )
                    })
                  )}
                  {matchingCreatures.length > 20 && (
                    <p className="border-t border-line p-3 text-xs text-muted">Showing the first 20 matches. Refine your search to see others.</p>
                  )}
                </div>
              )}
            </>
          )}
          {importError && catalogStatus !== 'network-error' && (
            <p role="alert" className="mt-3 text-sm text-orange">{importError}</p>
          )}
          {importMessage && (
            <p role="status" className="mt-3 border border-line bg-[#161a18] p-3 text-xs leading-relaxed text-muted">
              {importMessage}
            </p>
          )}
          <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-dim">{SRD_ATTRIBUTION}</p>
        </Panel>
      )}
    </section>
  )
}
