import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import PetDetailPage from "./pages/PetDetailPage";
import ReportPage from "./pages/ReportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import UserDashboard from "./pages/UserDashboard";
import EditPetPage from "./pages/EditPetPage";
import HowItWorks from "./components/HowItWorks";
import FAQ from "./components/FAQ";
import RescuerPage from "./pages/RescuerPage";

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
        <Route path="/account" element={<UserDashboard />} />
        <Route path="/edit-pet/:id" element={<EditPetPage />} />
        <Route path="/rescuer" element={<RescuerPage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </BrowserRouter>
  );
}
