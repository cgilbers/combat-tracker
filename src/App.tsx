import { ThemeProvider } from "@emotion/react";
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
import theme from "./theme/theme";

function App() {
    return (
        <ThemeProvider theme={theme}>
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
        </ThemeProvider>
    );
}

export default App;
