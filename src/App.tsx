import { ThemeProvider } from "@emotion/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { AuthProvider } from "./auth/AuthProvider";
import { Login } from "./components/Login";
import { PrivateRoute } from "./components/PrivateRoute";
import { CampaignCreate } from "./components/campaigns/CampaignCreate";
import { CampaignList } from "./components/campaigns/CampaignList";
import theme from "./theme/theme";

function App() {
    return (
        <ThemeProvider theme={theme}>
            <BrowserRouter basename="/combat-tracker">
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route
                                path="campaigns"
                                element={
                                    <PrivateRoute>
                                        <CampaignList />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/campaigns/new"
                                element={
                                    <PrivateRoute>
                                        <CampaignCreate />
                                    </PrivateRoute>
                                }
                            />
                        </Route>
                        <Route path="/login" element={<Login />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
