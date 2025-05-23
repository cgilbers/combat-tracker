import AddIcon from "@mui/icons-material/Add";
import {
    Alert,
    Box,
    Button,
    Fab,
    Link,
    List,
    ListItem,
    ListItemText,
    Stack,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { getCampaignsForUser } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas/CampaignData";

export const CampaignList = () => {
    const auth = useAuth();
    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
    const navigate = useNavigate();

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

    const handleCreateCampaign = async () => {
        navigate("/campaigns/new");
    };

    return (
        <Box>
            <Stack
                direction={"row"}
                sx={{ display: "flex", justifyContent: "end", flex: 1, p: 1 }}
            >
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleCreateCampaign}
                    sx={{
                        display: { xs: "none", sm: "block" },
                    }}
                >
                    New
                </Button>
            </Stack>
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
                <Alert sx={{ m: 1 }} severity="info">
                    No campaigns found. Please{" "}
                    <Link onClick={handleCreateCampaign}>create</Link> one
                </Alert>
            )}
            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: "fixed",
                    bottom: 16,
                    right: 16,
                    display: { sm: "none" },
                }}
                onClick={handleCreateCampaign}
            >
                <AddIcon />
            </Fab>
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
