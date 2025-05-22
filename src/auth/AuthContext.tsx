import type { User, UserCredential } from "firebase/auth";
import { createContext } from "react";

export type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<UserCredential>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {
        throw new Error("login function not implemented");
    },
    logout: () => {
        throw new Error("logout function not implemented");
    },
});
