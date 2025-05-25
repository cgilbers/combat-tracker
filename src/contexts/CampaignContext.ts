import { createContext } from "react";
import type { CampaignData } from "../firebase/schemas";

type CampaignContextType = {
    id: string | null;
    data: CampaignData | null;
    setCampaign: (campaign: CampaignData | null, id: string | null) => void;
};
export const CampaignContext = createContext<CampaignContextType>({
    id: null,
    data: null,
    setCampaign: () => {},
});
