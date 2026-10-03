import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import RescuerDashboard from "../components/RescuerDashboard";

/**
 * Trang quản lý ca cứu hộ cho rescuer (người cứu)
 */
export default function RescuerPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">⏳ Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-lg max-w-md text-center">
          <p className="text-lg font-semibold text-yellow-900 mb-2">🔐 Cần đăng nhập</p>
          <p className="text-sm text-yellow-800 mb-4">
            Vui lòng đăng nhập để xem và quản lý ca cứu hộ
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            📝 Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <RescuerDashboard />
      </div>
    </div>
  );
}
