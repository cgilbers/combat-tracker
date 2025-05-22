import type { User } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState, type PropsWithChildren } from "react";
import { auth } from "../firebase";
import { AuthContext, type AuthContextType } from "./AuthContext";

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
