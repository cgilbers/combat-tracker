import { Button } from '../components/Button'
import { FieldLabel, SelectInput, TextInput } from '../components/FormControls'
import { Panel } from '../components/Panel'
import { SectionHeading } from '../components/SectionHeading'
import type { Party } from '../domain/types'

type PartyPageProps = {
  parties: Party[]
  selectedPartyId: string
  party: Party | null
  pcName: string
  pcNotes: string
  onSelectParty: (partyId: string) => void
  onCreateParty: () => void
  onDeleteParty: () => void
  onUpdateParty: (update: (currentParty: Party) => Party) => void
  onPcNameChange: (value: string) => void
  onPcNotesChange: (value: string) => void
  onAddPc: () => void
  onRemovePc: (characterId: string) => void
}

export function PartyPage({
  parties,
  selectedPartyId,
  party,
  pcName,
  pcNotes,
  onSelectParty,
  onCreateParty,
  onDeleteParty,
  onUpdateParty,
  onPcNameChange,
  onPcNotesChange,
  onAddPc,
  onRemovePc,
}: PartyPageProps) {
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
            value={selectedPartyId}
            onChange={(event) => onSelectParty(event.target.value)}
          >
            <option value="">No party selected</option>
            {parties.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </SelectInput>
        </FieldLabel>
        <Button onClick={onCreateParty} className="shrink-0">
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
                onUpdateParty((currentParty) => ({
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
                onChange={(event) => onPcNameChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onAddPc()}
              />
            </FieldLabel>
            <FieldLabel className="min-w-0 flex-1">
              Notes
              <TextInput
                placeholder="Class, level, or other notes"
                value={pcNotes}
                onChange={(event) => onPcNotesChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onAddPc()}
              />
            </FieldLabel>
            <Button variant="icon" onClick={onAddPc} aria-label="Add character">
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
                      onUpdateParty((currentParty) => ({
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
                      onUpdateParty((currentParty) => ({
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
                  onClick={() => onRemovePc(member.id)}
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
          <Button variant="danger" onClick={onDeleteParty}>
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
