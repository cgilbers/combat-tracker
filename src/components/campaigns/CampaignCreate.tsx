import { Container, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCampaign } from "../../api/firebase/data/campaign";
import type { CampaignData } from "../../api/firebase/schemas";
import { useAuth } from "../../auth/useAuth";
import { useTitleContext } from "../../hooks/useTitleContext";
import { CampaignForm, type FormData } from "./CampaignForm";

/**
 *  CampaignCreate Component
 * @returns Component for creating a new campaign.
 */
export const CampaignCreate = () => {
    const { user } = useAuth();
    const [error, setError] = useState("");
    const navigate = useNavigate();
    useTitleContext({ value: "New Campaign" });

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
            <CampaignForm
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
