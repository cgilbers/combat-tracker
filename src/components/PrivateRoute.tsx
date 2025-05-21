import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PrivateRoute = ({ children }: PropsWithChildren) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" />;
};
