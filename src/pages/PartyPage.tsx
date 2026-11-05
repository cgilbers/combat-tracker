import { useState } from 'react'
import { Button } from '../components/Button'
import { FieldLabel, SelectInput, TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { SectionHeading } from '../components/SectionHeading'
import type { Party } from '../domain/types'

type PartyPageProps = {
  parties: Party[]
  onCreateParty: () => Party
  onDeleteParty: (partyId: string) => Promise<void>
  onUpdateParty: (party: Party) => void
}

export function PartyPage({
  parties,
  onCreateParty,
  onDeleteParty,
  onUpdateParty,
}: PartyPageProps) {
  const [selectedPartyId, setSelectedPartyId] = useState('')
  const [pcName, setPcName] = useState('')
  const [pcNotes, setPcNotes] = useState('')
  const effectivePartyId = parties.some((item) => item.id === selectedPartyId)
    ? selectedPartyId
    : parties[0]?.id ?? ''
  const party = parties.find((item) => item.id === effectivePartyId) ?? null

  const updateParty = (update: (currentParty: Party) => Party) => {
    if (party) onUpdateParty(update(party))
  }

  const addPc = () => {
    const name = pcName.trim()
    if (!name || !party) return

    updateParty((currentParty) => ({
      ...currentParty,
      members: [
        ...currentParty.members,
        { id: crypto.randomUUID(), name, notes: pcNotes.trim() || undefined },
      ],
    }))
    setPcName('')
    setPcNotes('')
  }

  const removePc = (characterId: string) => {
    updateParty((currentParty) => ({
      ...currentParty,
      members: currentParty.members.filter((member) => member.id !== characterId),
    }))
  }

  const createParty = () => {
    const newParty = onCreateParty()
    setSelectedPartyId(newParty.id)
    setPcName('')
    setPcNotes('')
  }

  const deleteParty = async () => {
    if (!party) return
    await onDeleteParty(party.id)
    setSelectedPartyId(parties.find((item) => item.id !== party.id)?.id ?? '')
  }

  return (
    <Panel>
      <SectionHeading
        step="01 / PARTY"
        title="Who is adventuring?"
        count={`${party?.members.length ?? 0} PCs`}
      />
      <div className="mb-5 flex items-end gap-3">
        <FieldLabel className="min-w-0 flex-1">
          Select party
          <SelectInput
            aria-label="Select party to manage"
            value={effectivePartyId}
            onChange={(event) => setSelectedPartyId(event.target.value)}
          >
            <option value="">No party selected</option>
            {parties.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </FieldLabel>
        <Button onClick={createParty} className="shrink-0">
          New party
        </Button>
      </div>
      {party ? (
        <>
          <FieldLabel className="mb-5">
            Party name
            <TextInput
              aria-label="Party name"
              value={party.name}
              onChange={(event) =>
                updateParty((currentParty) => ({
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
            <Button variant="icon" onClick={addPc} aria-label="Add character">
              +
            </Button>
          </div>
          <div className="mb-4 space-y-3">
            {party.members.map((member) => (
              <div
                className="grid grid-cols-1 items-end gap-3 border-b border-line pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                key={member.id}
              >
                <FieldLabel>
                  Character name
                  <TextInput
                    aria-label={`Name for ${member.name}`}
                    value={member.name}
                    onChange={(event) =>
                      updateParty((currentParty) => ({
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
                      updateParty((currentParty) => ({
                        ...currentParty,
                        members: currentParty.members.map((currentMember) =>
                          currentMember.id === member.id
                            ? { ...currentMember, notes: event.target.value || undefined }
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
          <Button variant="danger" onClick={deleteParty}>
            Delete party
          </Button>
        </>
      ) : (
        <p className="mb-4 text-sm text-muted">Create a party to manage its PCs.</p>
      )}
      <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Players keep their own HP and AC. This tracker only holds their place in initiative.
      </p>
    </Panel>
  )
}
