import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import PetDetailPage from "./pages/PetDetailPage";
import ReportPage from "./pages/ReportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ScanTicketPage from "./pages/ScanTicketPage";
import AdoptionListPage from "./pages/AdoptionListPage";
import DepositListPage from "./pages/DepositListPage";
import AdminDepositsPage from "./pages/AdminDepositsPage";
import DeliveryConfirmPage from "./pages/DeliveryConfirmPage";
import ProfilePage from "./pages/ProfilePage";
import UserReportPage from "./pages/UserReportPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import WalletPage from "./pages/WalletPage";
import UserDashboard from "./pages/UserDashboard";
import AdoptApplicantsPage from "./pages/AdoptApplicantsPage";
import DepositTicketPage from "./pages/DepositTicketPage";
import EditPetPage from "./pages/EditPetPage";
import MyAdoptionRequestsPage from "./pages/MyAdoptionRequestsPage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/map" element={<App />} />
        <Route path="/map-fullscreen" element={<MapPage />} />
        <Route path="/pet/:id" element={<PetDetailPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/scan-ticket" element={<ScanTicketPage />} />
        <Route path="/adoptions" element={<AdoptionListPage />} />
        <Route path="/deposits" element={<DepositListPage />} />
        <Route path="/admin/deposits" element={<AdminDepositsPage />} />
        <Route path="/deliver/:token" element={<DeliveryConfirmPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/report-user/:depositId" element={<UserReportPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/account" element={<UserDashboard />} />
        <Route path="/account/adopt/:petId/applicants" element={<AdoptApplicantsPage />} />
        <Route path="/deposit/:id/ticket" element={<DepositTicketPage />} />
        <Route path="/edit-pet/:id" element={<EditPetPage />} />
        <Route path="/my-adoption-requests" element={<MyAdoptionRequestsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
