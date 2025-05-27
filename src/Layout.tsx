import { Box, Stack } from "@mui/material";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import MenuBar from "./components/MenuBar";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { TitleContext } from "./contexts/TitleContext";

export const Layout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [title, setTitle] = useState<string>("Combat Tracker");

    const handleDrawerToggle = () => {
        if (!isClosing) {
            setMobileOpen(!mobileOpen);
        }
    };
    return (
        <TitleContext.Provider value={{ title, setTitle }}>
            <Stack sx={{ display: "flex" }}>
                <MenuBar toggleDrawer={handleDrawerToggle} />
                <NavigationDrawer
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                    setIsClosing={setIsClosing}
                />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        // width: { sm: `calc(100% - ${drawerWidth}px)` },
                        // ml: { sm: `${drawerWidth}px` },
                    }}
                >
                    <Outlet />
                </Box>
            </Stack>
        </TitleContext.Provider>
    );
};
