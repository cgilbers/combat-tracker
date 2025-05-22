import { z } from "zod";
import { EncounterCreatureDataSchema } from "./EncounterCreatureDataSchema";

// --- Encounter Data Schema ---
// Data stored at /encounters/{encounterId}

export const EncounterDataSchema = z.object({
    campaignId: z.string(), // Link to the parent campaign
    name: z.string(),
    // Example of using enum for status if you have specific states
    status: z.enum(["planning", "active", "completed"]).default("planning"),
    // Optional ordered list of creature instance IDs for the turn order
    turnOrder: z.array(z.string()).optional(),
    round: z.number().int().positive().optional(), // Current combat round

    // Nested list of creature *instances* for THIS encounter
    // The keys of this record are the push IDs generated for each encounter creature
    creatures: z.record(z.string(), EncounterCreatureDataSchema).optional(),
});
// Inferred TypeScript type for encounter data

export type EncounterData = z.infer<typeof EncounterDataSchema>;
