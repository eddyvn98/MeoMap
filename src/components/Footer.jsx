import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          {/* Brand */}
          <div>
            <p className="text-gray-400">🐱 MeoMap - Cộng đồng chăm sóc & cứu hộ mèo/chó</p>
          </div>

          {/* Learning & Support */}
          <div className="flex gap-4 text-sm">
            <Link to="/how-it-works" className="hover:text-white transition-colors">
              📚 Cách sử dụng
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/faq" className="hover:text-white transition-colors">
              ❓ FAQ
            </Link>
            <span className="text-gray-600">•</span>
            <a href="mailto:support@meomap.com" className="hover:text-white transition-colors">
              📧 Liên hệ
            </a>
          </div>

          {/* Copyright */}
          <p className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} MeoMap</p>
        </div>
      </div>
    </footer>
  );
}
