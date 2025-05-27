import { z } from "zod";

// --- Saved Creature Data Schema ---
// Data stored at /savedCreatures/{savedCreatureId}
export const AbilitiesSchema = z.object({
    strength: z.number().int(),
    dexterity: z.number().int(),
    constitution: z.number().int(),
    intelligence: z.number().int(),
    wisdom: z.number().int(),
    charisma: z.number().int(),
});

export const SavedCreatureDataSchema = z.object({
    ownerId: z.string(), // Link to the user who saved this creature
    name: z.string(),
    maxHp: z.number().int().positive(), // Max HP should be a positive integer
    armorClass: z.number().int().positive().optional(), // AC might be optional
    speed: z.string().optional(), // e.g., "30 ft", "fly 60 ft"
    abilities: AbilitiesSchema, // e.g., { strength: 10, dexterity: 14, ... }
    notes: z.string().optional(),
});
// Inferred TypeScript type for saved creature data

export type SavedCreatureData = z.infer<typeof SavedCreatureDataSchema>;

export type Abilities = z.infer<typeof AbilitiesSchema>;
