import { Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useTitleContext } from "../hooks/useTitleContext";

export const Home = () => {
    useTitleContext({ value: "Combat Tracker" });
    const auth = useAuth();

    return (
        <Stack gap={2} sx={{ p: 2 }}>
            <Typography>Welcome to the Combat Tracker</Typography>
            {auth.user ? (
                <Typography>Logged in as {auth.user.email}</Typography>
            ) : (
                <Typography>
                    Please <Link to={"/login"}>log in.</Link>
                </Typography>
            )}
        </Stack>
    );
};
