import { AccountCircle, MenuOutlined } from "@mui/icons-material";
import {
    AppBar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Toolbar,
    useTheme,
} from "@mui/material";
import { useContext, useState } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { TitleContext } from "../contexts/TitleContext";
import { Header } from "../theme/styles";

const MenuButton = (props: NavLinkProps) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                display: { xs: "none", sm: "block" },
                p: 1,
                fontFamily: theme.typography.fontFamily,
            }}
        >
            <NavLink
                {...props}
                style={({ isActive }) => ({
                    textDecoration: "none",
                    color: isActive
                        ? theme.palette.secondary.main
                        : theme.palette.primary.contrastText,
                    alignItems: "center",
                })}
            />
        </Box>
    );
};

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
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Toolbar variant="dense">
                    <Header sx={{ flexGrow: 1, color: "inherit" }}>
                        {title}
                    </Header>
                    {auth.user && (
                        <Stack
                            direction={"row"}
                            sx={{ alignItems: "center", display: "flex" }}
                        >
                            <MenuButton to="/campaigns">Campaigns</MenuButton>
                            <MenuButton to="/encounters">Encounters</MenuButton>
                            <MenuButton to="/creatures">Creatures</MenuButton>
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
                        </Stack>
                    )}
                    <IconButton
                        onClick={toggleDrawer}
                        sx={{ ml: 1, display: { sm: "none" } }}
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                    >
                        <MenuOutlined />
                    </IconButton>
                </Toolbar>
            </AppBar>
        </Box>
    );
};

export default MenuBar;
