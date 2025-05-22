import { z } from "zod";

// --- User Data Schema ---
// Data stored at /users/{userId}
export const UserDataSchema = z.object({
    displayName: z.string(),
    // Optional: You might store when the user was created or last updated
    createdAt: z.number().optional(), // Assuming timestamp in milliseconds
    // Add other user-specific fields as needed
});

// Inferred TypeScript type for user data
export type UserData = z.infer<typeof UserDataSchema>;
