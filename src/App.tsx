import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { Login } from "./components/Login";
import MenuBar from "./components/MenuBar";
import { PrivateRoute } from "./components/PrivateRoute";
import { CampaignCreate } from "./components/campaigns/CampaignCreate";
import { CampaignList } from "./components/campaigns/CampaignList";

function App() {
    return (
        <BrowserRouter basename="/combat-tracker">
            <AuthProvider>
                <MenuBar />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/campaigns"
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
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
