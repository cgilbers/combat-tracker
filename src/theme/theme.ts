import { createTheme } from "@mui/material";

const defaultTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#2e7d32",
            light: "#60ad5e",
        },
        secondary: {
            main: "#f9a825",
        },
    },
    typography: {
        h1: {
            fontFamily: "Metamorphous",
        },
        h2: {
            fontFamily: "Metamorphous",
        },
        h3: {
            fontFamily: "Metamorphous",
        },
        h4: {
            fontFamily: "Metamorphous",
        },
    },
});

export default defaultTheme;
