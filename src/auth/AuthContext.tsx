import type { User, UserCredential } from "firebase/auth";
import { createContext } from "react";

/**
 * AuthContextType defines the shape of the authentication context.
 * It includes the user object and methods for login and logout.
 */
export type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<UserCredential>;
    logout: () => Promise<void>;
};

/**
 * AuthContext is a React context that provides authentication state and methods.
 */
export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {
        throw new Error("login function not implemented");
    },
    logout: () => {
        throw new Error("logout function not implemented");
    },
});
