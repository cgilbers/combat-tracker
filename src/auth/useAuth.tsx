import { useContext } from "react";
import { AuthContext } from "./AuthContext";

/**
 * useAuth is a custom hook that provides access to the authentication context.
 * It throws an error if used outside of the AuthProvider.
 * @returns The authentication context
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
