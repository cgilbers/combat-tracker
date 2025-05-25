import { AccountCircle, MenuOutlined } from "@mui/icons-material";
import {
    AppBar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
} from "@mui/material";
import { useContext, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { TitleContext } from "../contexts/TitleContext";
import { Header } from "../theme/styles";

type MenuBarProps = {
    toggleDrawer: () => void;
};
export const MenuBar = ({ toggleDrawer }: MenuBarProps) => {
    const auth = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { title } = useContext(TitleContext);

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
