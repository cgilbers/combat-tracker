import { z } from "zod";

// --- Campaign Data Schema ---
// Data stored at /campaigns/{campaignId}

export const CampaignDataSchema = z.object({
    ownerId: z.string(), // Link to the user who owns this campaign
    name: z.string(),
    createdAt: z.number().optional(), // Timestamp when the campaign was created

    // Simple list of player names. Using a record with boolean flags is common in RTDB.
    // If players needed more data, this would be z.record(z.string(), z.object({...}))
    players: z.record(
        z.string(),
        z.object({
            playerName: z.string(),
            characterName: z.string(),
        })
    ),
});

// Inferred TypeScript type for campaign data
export type CampaignData = z.infer<typeof CampaignDataSchema>;
