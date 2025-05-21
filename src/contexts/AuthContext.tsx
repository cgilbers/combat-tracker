import type { User, UserCredential } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
    createContext,
    useContext,
    useState,
    type PropsWithChildren,
} from "react";
import { auth } from "../firebase";

type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<UserCredential>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {
        throw new Error("login function not implemented");
    },
    logout: () => {
        throw new Error("logout function not implemented");
    },
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return auth.signOut();
    };

    auth.onAuthStateChanged((user) => {
        console.log("auth state changed", user);
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
