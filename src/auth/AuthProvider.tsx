import type { User } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState, type PropsWithChildren } from "react";
import { auth } from "../api/firebase/firebaseConfig";
import { AuthContext, type AuthContextType } from "./AuthContext";

/**
 * AuthProvider is a React component that provides authentication context to its children.
 * @param children - The children to be rendered inside the AuthProvider
 * @returns
 */
export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return auth.signOut();
    };

    auth.onAuthStateChanged((user) => {
        setUser(user);
    });

    const value: AuthContextType = {
        user,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
