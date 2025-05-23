import { Box } from "@mui/material";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import MenuBar from "./components/MenuBar";
import { drawerWidth, NavigationDrawer } from "./components/NavigationDrawer";

export const Layout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleDrawerToggle = () => {
        if (!isClosing) {
            setMobileOpen(!mobileOpen);
        }
    };
    return (
        <Box sx={{ display: "flex" }}>
            <NavigationDrawer
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                setIsClosing={setIsClosing}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <MenuBar toggleDrawer={handleDrawerToggle} />
                <Outlet />
            </Box>
        </Box>
    );
};
