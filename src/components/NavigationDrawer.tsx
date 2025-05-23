import {
    Box,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import DragonIcon from "../assets/ic_dragon.svg?react";
import SwordIcon from "../assets/ic_sword.svg?react";
import { Header } from "../theme/styles";

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
    const handleDrawerClose = () => {
        setIsClosing(true);
        setMobileOpen(false);
    };

    const handleDrawerTransitionEnd = () => {
        setIsClosing(false);
    };

    const drawer = (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                }}
            >
                <Header>Campaign Title</Header>
            </Box>
            <Divider />
            <List>
                <ListItem>
                    <ListItemButton>
                        <ListItemIcon>
                            <SwordIcon />
                        </ListItemIcon>
                        <ListItemText primary="Encounters" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton>
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
