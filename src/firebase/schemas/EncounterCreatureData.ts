import { z } from "zod";

// --- Encounter Creature Data Schema ---
// Data stored nested within an encounter at /encounters/{encounterId}/creatures/{encounterCreatureId}
// This represents an *instance* of a creature within a specific encounter.
// It denormalizes some data and includes encounter-specific stats like current HP and initiative.

export const EncounterCreatureDataSchema = z.object({
    // We don't need ownerId here, access is governed by the parent campaign owner
    savedCreatureId: z.string().nullable().optional(), // Link back to a saved creature template if applicable
    name: z.string(), // Denormalized name from template or custom name
    initiative: z.number().int(), // Initiative roll for THIS encounter
    currentHp: z.number().int().min(0), // Current HP (can be 0)
    maxHp: z.number().int().positive(), // Denormalized max HP
    conditions: z.record(z.string(), z.boolean()).optional(), // e.g., { "poisoned": true, "prone": false }
    notes: z.string().optional(), // Notes specific to this creature instance
    // Add other encounter-specific creature data here (e.g., temp HP)
});
// Inferred TypeScript type for encounter creature instance data

export type EncounterCreatureData = z.infer<typeof EncounterCreatureDataSchema>;
