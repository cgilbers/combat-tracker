import { createContext } from "react";

type TitleContextType = {
    title: string;
    setTitle: (title: string) => void;
};

export const TitleContext = createContext<TitleContextType>({
    title: "Combat Tracker",
    setTitle: () => {},
});
