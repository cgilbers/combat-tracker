import { AccountCircle, MenuOutlined } from "@mui/icons-material";
import {
    AppBar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Header } from "../theme/styles";

const navbarTitles: Record<string, string> = {
    "/campaigns": "Campaigns",
};

type MenuBarProps = {
    toggleDrawer: () => void;
};
export const MenuBar = ({ toggleDrawer }: MenuBarProps) => {
    const auth = useAuth();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [title, setTitle] = useState<string>("");

    useEffect(() => {
        const currentPath = location.pathname;
        const newTitle = navbarTitles[currentPath] || "Combat Tracker";
        setTitle(newTitle);
    }, [location.pathname]);

    const handleLogout = () => {
        handleClose();
        auth.logout();
    };

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <IconButton
                        onClick={toggleDrawer}
                        sx={{ mr: 2, display: { sm: "none" } }}
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                    >
                        <MenuOutlined />
                    </IconButton>
                    <Header sx={{ flexGrow: 1, color: "inherit" }}>
                        {title}
                    </Header>
                    {auth.user && (
                        <div>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenu}
                                color="inherit"
                            >
                                <AccountCircle />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: "top",
                                    horizontal: "right",
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "right",
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                <MenuItem onClick={handleLogout}>
                                    Logout
                                </MenuItem>
                            </Menu>
                        </div>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    );
};

export default MenuBar;
