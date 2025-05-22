import { AccountCircle } from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import {
    AppBar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

export const MenuBar = () => {
    const auth = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                    >
                        Combat Tracker
                    </Typography>
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
