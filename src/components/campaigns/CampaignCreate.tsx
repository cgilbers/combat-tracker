import { Container, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    const [error, setError] = useState("");
    const navigate = useNavigate();

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

        createCampaign(campaignData, user.uid)
            .then((id) => {
                navigate(`/campaigns/${id}`);
            })
            .catch(() => {
                setError("Failed to create campaign. Please try again.");
            });
    };

    return (
        <Stack gap={2}>
            <CampaginForm
                onSubmit={onSubmit}
                defaultValues={{ name: "", playersList: [] }}
            />
            <Container maxWidth="md">
                {error && (
                    <Typography variant="body2" color="error">
                        {error}
                    </Typography>
                )}
            </Container>
        </Stack>
    );
};
