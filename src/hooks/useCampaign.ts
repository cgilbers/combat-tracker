import { useContext } from "react";
import { CampaignContext } from "../contexts/CampaignContext";

export const useCampaign = () => {
    const campaign = useContext(CampaignContext);
    if (!campaign) {
        throw new Error("useCampaign must be used within a CampaignProvider");
    }
    return campaign;
};
