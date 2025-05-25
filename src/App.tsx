import { ThemeProvider } from "@emotion/react";
import { useState } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { AuthProvider } from "./auth/AuthProvider";
import { Login } from "./components/Login";
import { PrivateRoute } from "./components/PrivateRoute";
import {
    CampaignCreate,
    CampaignEdit,
    CampaignList,
} from "./components/campaigns";
import { CampaignContext } from "./contexts/CampaignContext";
import type { CampaignData } from "./firebase/schemas";
import theme from "./theme/theme";

type AppState = {
    currentCampaignId: string | null;
    currentCampaignData: CampaignData | null;
};

function App() {
    const [currentState, setCurrentState] = useState<AppState>({
        currentCampaignId: null,
        currentCampaignData: null,
    });
    return (
        <ThemeProvider theme={theme}>
            <CampaignContext.Provider
                value={{
                    id: currentState.currentCampaignId,
                    data: currentState.currentCampaignData,
                    setCampaign: (campaign, id) => {
                        setCurrentState({
                            currentCampaignId: id,
                            currentCampaignData: campaign,
                        });
                    },
                }}
            >
                <HashRouter basename={"/"}>
                    <AuthProvider>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route
                                    path="/"
                                    element={
                                        <PrivateRoute>
                                            <Link to="/campaigns">
                                                Go to Campaigns
                                            </Link>
                                        </PrivateRoute>
                                    }
                                ></Route>
                                <Route
                                    path="campaigns"
                                    element={
                                        <PrivateRoute>
                                            <CampaignList />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="campaigns/new"
                                    element={
                                        <PrivateRoute>
                                            <CampaignCreate />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="campaigns/:id"
                                    element={
                                        <PrivateRoute>
                                            <CampaignEdit />
                                        </PrivateRoute>
                                    }
                                />
                            </Route>
                            <Route path="/login" element={<Login />} />
                        </Routes>
                    </AuthProvider>
                </HashRouter>
            </CampaignContext.Provider>
        </ThemeProvider>
    );
}

export default App;
