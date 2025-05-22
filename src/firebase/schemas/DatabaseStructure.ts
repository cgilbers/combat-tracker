import type { CampaignData } from "./CampaignData";
import type { EncounterData } from "./EncounterData";
import type { SavedCreatureData } from "./SavedCreatureData";
import type { UserData } from "./UserData";

// --- Helper type for the structure of the top-level collections ---
// This shows the expected shape of the top-level RTDB nodes.

export type DatabaseStructure = {
    users?: Record<string, UserData>;
    campaigns?: Record<string, CampaignData>;
    encounters?: Record<string, EncounterData>;
    savedCreatures?: Record<string, SavedCreatureData>;
};
