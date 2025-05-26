import { ThemeProvider } from "@emotion/react";
import { useState } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./Layout";
import { AuthProvider } from "./auth/AuthProvider";
import { Home } from "./components/Home";
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

const router = createHashRouter([
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            { path: "login", element: <Login /> },
            {
                path: "campaigns/*",
                children: [
                    {
                        index: true,
                        element: (
                            <PrivateRoute>
                                <CampaignList />
                            </PrivateRoute>
                        ),
                    },
                    {
                        path: "campaigns/new",
                        element: (
                            <PrivateRoute>
                                <CampaignCreate />
                            </PrivateRoute>
                        ),
                    },
                    {
                        path: "campaigns/:id",
                        element: (
                            <PrivateRoute>
                                <CampaignEdit />
                            </PrivateRoute>
                        ),
                    },
                ],
            },
        ],
    },
]);

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
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </CampaignContext.Provider>
        </ThemeProvider>
    );
}

export default App;
