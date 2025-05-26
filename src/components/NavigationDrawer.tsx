import {
    Box,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DragonIcon, SwordIcon } from "../assets";
import { useCampaign } from "../hooks/useCampaign";
import { Header, Label } from "../theme/styles";

export const drawerWidth = 240;

type NavigationDrawerProps = {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    setIsClosing: (closing: boolean) => void;
};

export const NavigationDrawer = ({
    mobileOpen,
    setMobileOpen,
    setIsClosing,
}: NavigationDrawerProps) => {
    const { data } = useCampaign();
    const navigate = useNavigate();
    const handleDrawerClose = () => {
        setIsClosing(true);
        setMobileOpen(false);
    };

    const handleDrawerTransitionEnd = () => {
        setIsClosing(false);
    };

    const drawer = (
        <Box>
            <Stack
                onClick={() => {
                    navigate("/campaigns");
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                    cursor: "pointer",
                }}
            >
                <Label>Campaign:</Label>
                <Header>{data?.name ?? "No Campaign Selected"}</Header>
            </Stack>
            <Divider />
            <List sx={{ p: 0 }}>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate("/encounters")}>
                        <ListItemIcon>
                            <SwordIcon />
                        </ListItemIcon>
                        <ListItemText primary="Encounters" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate("/creatures")}>
                        <ListItemIcon>
                            <DragonIcon />
                        </ListItemIcon>
                        <ListItemText primary="Creatures" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box>
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onTransitionEnd={handleDrawerTransitionEnd}
                onClose={handleDrawerClose}
                sx={{
                    display: { xs: "block", sm: "none" },
                    "& .MuiDrawer-paper": {
                        boxSizing: "border-box",
                        width: drawerWidth,
                    },
                }}
                slotProps={{
                    root: {
                        keepMounted: true, // Better open performance on mobile.
                    },
                }}
            >
                {drawer}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", sm: "block" },
                    "& .MuiDrawer-paper": {
                        boxSizing: "border-box",
                        width: drawerWidth,
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};
