import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import PetDetailPage from "./pages/PetDetailPage";
import ReportPage from "./pages/ReportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import EditPetPage from "./pages/EditPetPage";
import HowItWorks from "./components/HowItWorks";
import FAQ from "./components/FAQ";
import RescuerPage from "./pages/RescuerPage";
import UserDashboard from "./pages/UserDashboard";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/map" element={<App />} />
        <Route path="/map-fullscreen" element={<MapPage />} />
        <Route path="/pet/:id" element={<PetDetailPage />} />
        <Route path="/pet-detail/:id" element={<PetDetailPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/edit-pet/:id" element={<EditPetPage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/rescuer" element={<RescuerPage />} />
        <Route path="/account" element={<UserDashboard />} />

        {/* Legacy money/transaction routes are intentionally disabled. */}
        <Route path="/wallet" element={<Navigate to="/account" replace />} />
        <Route path="/my-wallet" element={<Navigate to="/account" replace />} />
        <Route path="/my-wallet-p2p" element={<Navigate to="/account" replace />} />
        <Route path="/store" element={<Navigate to="/" replace />} />
        <Route path="/deposits" element={<Navigate to="/account" replace />} />
        <Route path="/deposit/*" element={<Navigate to="/account" replace />} />
        <Route path="/deliver/*" element={<Navigate to="/account" replace />} />
        <Route path="/my-adoption-requests" element={<Navigate to="/account" replace />} />
        <Route path="/account/adopt/*" element={<Navigate to="/account" replace />} />
        <Route path="/admin/deposits" element={<Navigate to="/account" replace />} />
        <Route path="/admin/topups" element={<Navigate to="/account" replace />} />
        <Route path="/admin/withdrawals" element={<Navigate to="/account" replace />} />
        <Route path="/admin/withdrawals-p2p" element={<Navigate to="/account" replace />} />
        <Route path="/admin/shop" element={<Navigate to="/account" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
