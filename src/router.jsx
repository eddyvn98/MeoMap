import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import MapPage from "./pages/MapPage";
import PetDetailPage from "./pages/PetDetailPage";
import ReportPage from "./pages/ReportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ScanTicketPage from "./pages/ScanTicketPage";
import AdoptionListPage from "./pages/AdoptionListPage";
import DepositListPage from "./pages/DepositListPage";
import AdminDepositsPage from "./pages/AdminDepositsPage";
import DeliverPage from "./pages/DeliverPage";
import ProfilePage from "./pages/ProfilePage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/pet/:id" element={<PetDetailPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/scan-ticket" element={<ScanTicketPage />} />
        <Route path="/adoptions" element={<AdoptionListPage />} />
        <Route path="/deposits" element={<DepositListPage />} />
        <Route path="/admin/deposits" element={<AdminDepositsPage />} />
        <Route path="/deliver/:token" element={<DeliverPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}
