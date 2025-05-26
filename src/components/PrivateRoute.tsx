import { CircularProgress } from "@mui/material";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export const PrivateRoute = () => {
    const [authStateReady, setAuthStateReady] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const auth = getAuth();
        auth.authStateReady().then(() => {
            if (!auth.currentUser) {
                navigate("/login");
            }

            setAuthStateReady(true);
        });
    }, [navigate]);

    useEffect(() => {
        if (authStateReady && !user) {
            navigate("/login");
        }
    }, [user, navigate, authStateReady]);

    return authStateReady && user ? <Outlet /> : <CircularProgress />;
};
