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
    { path: "login", element: <Login /> },
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                element: <PrivateRoute />,
                children: [
                    {
                        index: true,
                        element: <Home />,
                    },
                    {
                        path: "campaigns/*",
                        children: [
                            {
                                index: true,
                                element: <CampaignList />,
                            },
                            {
                                path: "new",
                                element: <CampaignCreate />,
                            },
                            {
                                path: ":id",
                                element: <CampaignEdit />,
                            },
                        ],
                    },
                    {
                        path: "encounters/*",
                        children: [
                            {
                                index: true,
                                element: <div>Encounters List</div>,
                            },
                            {
                                path: "new",
                                element: <div>Create Encounter</div>,
                            },
                            {
                                path: ":id",
                                element: <div>Encounter Details</div>,
                            },
                        ],
                    },
                    {
                        path: "creatures/*",
                        children: [
                            {
                                index: true,
                                element: <div>Creature List</div>,
                            },
                            {
                                path: "new",
                                element: <div>Create Creature</div>,
                            },
                            {
                                path: ":id",
                                element: <div>Creature Details</div>,
                            },
                        ],
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
