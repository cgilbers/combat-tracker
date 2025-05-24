import {
    equalTo,
    get,
    orderByChild,
    push,
    query,
    ref,
    set,
    update,
    type DatabaseReference,
} from "firebase/database";
import { z } from "zod";
import { database } from "../firebaseConfig";
import { CampaignDataSchema, type CampaignData } from "../schemas/CampaignData";

const campaignsRef: DatabaseReference = ref(database, "campaigns");

/**
 * Function to get all campaigns for a specific user
 * @param ownerId  - The ID of the user whose campaigns we want to fetch
 * @returns  - An array of CampaignData objects for the specified user
 * @throws  - Throws an error if the data validation fails
 */
export async function getCampaignsForUser(
    ownerId: string
): Promise<{ data: CampaignData; id: string }[]> {
    const snapshot = await get(
        query(campaignsRef, orderByChild("ownerId"), equalTo(ownerId))
    );

    if (snapshot.exists()) {
        const rawData = snapshot.val();
        const recordSchema = z.record(z.string(), CampaignDataSchema);

        const validatedData = recordSchema.safeParse(rawData);
        if (validatedData.success) {
            return Object.entries(validatedData.data).map(([key, value]) => ({
                data: value,
                id: key,
            }));
        } else {
            console.error(
                "Data validation failed for campaigns:",
                validatedData.error
            );
            return [];
        }
    } else {
        console.log("No campaigns found for user:", ownerId);
        return [];
    }
}

// Function to get a single campaign by ID
export async function getCampaign(
    campaignId: string
): Promise<CampaignData | null> {
    const campaignItemRef = ref(database, `campaigns/${campaignId}`);
    const snapshot = await get(campaignItemRef);

    if (snapshot.exists()) {
        const rawData = snapshot.val();
        try {
            // **Validation on Read:** Validate data coming FROM Firebase
            const validatedData = CampaignDataSchema.parse(rawData);
            console.log(`Fetched and validated campaign ${campaignId}`);
            return validatedData; // Return the validated data (type is CampaignData)
        } catch (error) {
            console.error(
                `Data validation failed for campaign ${campaignId}:`,
                error
            );
            // Decide how to handle validation errors - return null, throw, etc.
            return null;
        }
    } else {
        console.log(`No data found for campaign ${campaignId}`);
        return null;
    }
}

/**
 * Function to create a new campaign
 * @param newCampaignData - The new campaign data to be created
 * @param ownerId  - The ID of the owner of the campaign
 * @returns  - The ID of the newly created campaign
 */
export async function createCampaign(
    newCampaignData: Omit<CampaignData, "ownerId">,
    ownerId: string
): Promise<string | null> {
    // Prepare the data object, adding the ownerId
    const dataToWrite = {
        ...newCampaignData,
        ownerId: ownerId,
        createdAt: Date.now(),
    };

    try {
        // **Validation on Write:** Validate data *before* sending to Firebase
        // Use safeParse if you want to handle errors without crashing, or parse if you expect it to be right
        CampaignDataSchema.parse(dataToWrite); // Validate the full object including ownerId

        console.log("Campaign data validated locally, pushing to DB...");
        const newCampaignRef = push(campaignsRef);
        await set(newCampaignRef, dataToWrite);

        console.log(
            "Campaign created successfully with ID:",
            newCampaignRef.key
        );
        return newCampaignRef.key;
    } catch (error) {
        console.error("Failed to create campaign:", error);
        throw error;
    }
}

// Function to update a campaign (partial update)
export async function updateCampaign(
    campaignId: string,
    updates: Partial<CampaignData>
): Promise<void> {
    const campaignItemRef = ref(database, `campaigns/${campaignId}`);

    try {
        // Optional: Validate the *updates* object if needed, or rely on Firebase rules
        CampaignDataSchema.partial().parse(updates); // Use .partial() for partial updates

        console.log(`Updating campaign ${campaignId} with:`, updates);
        await update(campaignItemRef, updates); // Use update for partial updates
        console.log(`Campaign ${campaignId} updated successfully`);
    } catch (error) {
        console.error(`Failed to update campaign ${campaignId}:`, error);
        throw error;
    }
}
