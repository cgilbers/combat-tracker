import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { getCampaignsForUser } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas/CampaignData";

export const CampaignList = () => {
    const auth = useAuth();
    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const fetchedCampaigns = await getCampaignsForUser(
                    auth.user!.uid
                );
                setCampaigns(fetchedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            }
        };

        fetchCampaigns();
    }, [auth.user]);

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Campaign List
            </Typography>
            {campaigns.length > 0 ? (
                <List>
                    {campaigns.map((campaign: CampaignData) => (
                        <CampaignListItem
                            key={campaign.name}
                            campaign={campaign}
                        />
                    ))}
                </List>
            ) : (
                <p>No campaigns found.</p>
            )}
        </Box>
    );
};

type CampaignListItemProps = {
    campaign: CampaignData;
};

const CampaignListItem = ({ campaign }: CampaignListItemProps) => {
    return (
        <ListItem>
            <ListItemText primary={campaign.name} />
        </ListItem>
    );
};
