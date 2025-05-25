import { Button, Container, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
    deleteCampaign,
    getCampaign,
    updateCampaign,
} from "../../firebase/data/campaign";
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
    const navigate = useNavigate();
    const [error, setError] = useState("");

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

        updateCampaign(id, campaignData)
            .then(() => {
                navigate(`/campaigns`);
            })
            .catch(() => {
                setError("Failed to update campaign. Please try again.");
            });
    };

    const handleDelete = () => {
        if (!user || !id) return;
        deleteCampaign(id, user.uid)
            .then(() => {
                navigate("/campaigns");
            })
            .catch(() => {
                setError("Failed to delete campaign. Please try again.");
            });
    };

    return (
        <Stack gap={2}>
            <CampaginForm
                onSubmit={onSubmit}
                defaultValues={getDefaultValues}
            />
            <Container maxWidth="md">
                <Button variant="outlined" onClick={handleDelete}>
                    Delete
                </Button>
                {error && (
                    <Typography variant="body2" color="error">
                        {error}
                    </Typography>
                )}
            </Container>
        </Stack>
    );
};
