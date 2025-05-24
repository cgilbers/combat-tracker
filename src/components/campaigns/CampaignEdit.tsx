import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { getCampaign, updateCampaign } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas/CampaignData";
import { CampaginForm, type FormData } from "./CampaignForm";

const defaultValues = {
    name: "",
    playersList: [],
};

/**
 * CampaignEdit Component
 * @returns Component for editing an existing campaign.
 */
export const CampaignEdit = () => {
    const { user } = useAuth();
    const { id } = useParams<{ id: string }>();

    const getDefaultValues = async () => {
        if (!id) {
            return defaultValues;
        }
        const data = await getCampaign(id);

        if (!data) {
            return defaultValues;
        }

        return {
            name: data.name,
            playersList: Object.entries(data.players).map(([key, value]) => ({
                id: key,
                playerName: value.playerName,
                characterName: value.characterName,
            })),
        };
    };

    const onSubmit = (data: FormData) => {
        if (!user || !id) return;

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

        const campaignData: Partial<CampaignData> = {
            name: data.name,
            players,
        };

        updateCampaign(id, campaignData);
    };

    return (
        <CampaginForm onSubmit={onSubmit} defaultValues={getDefaultValues} />
    );
};
