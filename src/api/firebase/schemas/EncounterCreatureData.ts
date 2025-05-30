import { z } from "zod";
import { SavedCreatureDataSchema } from "./SavedCreatureData";

// --- Encounter Creature Data Schema ---
// Data stored nested within an encounter at /encounters/{encounterId}/creatures/{encounterCreatureId}
// This represents an *instance* of a creature within a specific encounter.
// It denormalizes some data and includes encounter-specific stats like current HP and initiative.

export const EncounterCreatureDataSchema = SavedCreatureDataSchema.extend({
    savedCreatureId: z.string().nullable().optional(), // Link back to a saved creature template if applicable
    initiative: z.number().int(), // Initiative roll for THIS encounter
    currentHp: z.number().int().min(0), // Current HP (can be 0)
    conditions: z.record(z.string(), z.boolean()).optional(), // e.g., { "poisoned": true, "prone": false }
});

// Inferred TypeScript type for encounter creature instance data
export type EncounterCreatureData = z.infer<typeof EncounterCreatureDataSchema>;
