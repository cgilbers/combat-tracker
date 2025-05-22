import { z } from "zod";

// --- Saved Creature Data Schema ---
// Data stored at /savedCreatures/{savedCreatureId}
// This represents the *template* for a creature saved by a user.

export const SavedCreatureDataSchema = z.object({
    ownerId: z.string(), // Link to the user who saved this creature
    name: z.string(),
    maxHp: z.number().int().positive(), // Max HP should be a positive integer
    armorClass: z.number().int().positive().optional(), // AC might be optional
    speed: z.string().optional(), // e.g., "30 ft", "fly 60 ft"
    abilities: z.record(z.string(), z.number().int()).optional(), // e.g., { strength: 10, dexterity: 14, ... }
    notes: z.string().optional(),
    // Add other template stats here (skills, saves, etc.)
});
// Inferred TypeScript type for saved creature data

export type SavedCreatureData = z.infer<typeof SavedCreatureDataSchema>;
