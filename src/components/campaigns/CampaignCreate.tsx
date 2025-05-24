import { useAuth } from "../../auth/useAuth";
import { createCampaign } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas/CampaignData";
import { CampaginForm, type FormData } from "./CampaignForm";

/**
 *  CampaignCreate Component
 * @returns Component for creating a new campaign.
 */
export const CampaignCreate = () => {
    const { user } = useAuth();

    const onSubmit = (data: FormData) => {
        if (!user) return;

        const players: CampaignData["players"] = data.playersList.reduce(
            (prev, item) => ({
                ...prev,
                [item.id]: {
                    playerName: item.playerName,
                    characterName: item.characterName,
                },
            }),
            {}
        );

        const campaignData: CampaignData = {
            ownerId: user.uid,
            name: data.name,
            players,
            createdAt: Date.now(),
        };

        createCampaign(campaignData, user.uid);
    };

    return (
        <CampaginForm
            onSubmit={onSubmit}
            defaultValues={{ name: "", playersList: [] }}
        />
    );
};
