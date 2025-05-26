import { styled, Typography } from "@mui/material";

export const Header = styled(Typography)(({ theme }) => ({
    fontSize: "1.2rem",
    fontFamily: theme.typography.h1.fontFamily,
    fontWeight: 500,
    color: theme.palette.text.primary,
}));

export const Title = styled(Header)(({ theme }) => ({
    marginBottom: theme.spacing(2),
}));

export const Label = styled(Typography)(({ theme }) => ({
    fontSize: "0.8rem",
    fontFamily: theme.typography.body1.fontFamily,
    color: theme.palette.text.secondary,
}));
