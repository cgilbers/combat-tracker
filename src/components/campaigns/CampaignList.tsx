import { Star, StarBorder } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import {
    Alert,
    Box,
    Button,
    Fab,
    Link,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { getCampaignsForUser } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas";
import { useCampaign } from "../../hooks/useCampaign";
import { useTitleContext } from "../../hooks/useTitleContext";

export const CampaignList = () => {
    const auth = useAuth();
    const [campaigns, setCampaigns] = useState<
        { data: CampaignData; id: string }[]
    >([]);
    const navigate = useNavigate();
    useTitleContext({ value: "Campaigns" });

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
                    {campaigns.map(({ data, id }) => (
                        <CampaignListItem key={id} campaign={data} id={id} />
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
    id: string;
};

const CampaignListItem = ({ campaign, id }: CampaignListItemProps) => {
    const navigate = useNavigate();
    const { id: currentId, setCampaign } = useCampaign();
    return (
        <ListItem disablePadding>
            <ListItemButton
                onClick={() => {
                    navigate(`/campaigns/${id}`);
                }}
            >
                <ListItemText primary={campaign.name} />
                <ListItemIcon
                    onClick={(e) => {
                        e.stopPropagation();
                        setCampaign(campaign, id);
                    }}
                    sx={{
                        color: "secondary.main",
                    }}
                >
                    {id === currentId ? <Star /> : <StarBorder />}
                </ListItemIcon>
            </ListItemButton>
        </ListItem>
    );
};
