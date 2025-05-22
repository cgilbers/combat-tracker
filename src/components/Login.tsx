import { Box, Button, Card, Grid, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
export const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        await login(email, password)
            .then(() => {
                navigate("/");
            })
            .catch((error: Error) => {
                console.error("Error: ", error);
                setError("Could not log in. Please check your credentials.");
            });
    };
    return (
        <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{ height: "calc(100vh - 48px)", backgroundColor: "#f5f5f5" }}
        >
            <Card sx={{ p: 2, width: 250 }}>
                <Typography variant="h5" gutterBottom>
                    Login
                </Typography>
                <Box
                    component={"form"}
                    onSubmit={handleSubmit}
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        m: 2,
                    }}
                >
                    <TextField
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                    />
                    <TextField
                        value={password}
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                    />
                    {error && (
                        <Typography variant="body2" color="error">
                            {error}
                        </Typography>
                    )}
                    <Button type={"submit"}>Login</Button>
                </Box>
            </Card>
        </Grid>
    );
};
