import { useNavigate } from "react-router-dom";

export default function QRWithScanButton() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-full">
      {/* Hình QR */}
      <img
        src="/path/to/qr-code.png"
        alt="QR Code"
        className="w-64 h-64 mx-auto mt-10"
      />

      {/* Nút tròn floating */}
      <button
        onClick={() => navigate("/scan-ticket")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition z-50"
      >
        {/* Icon ví dụ: camera */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A2 2 0 0121 9.618v4.764a2 2 0 01-1.447 1.894L15 14m-6 0l-4.553 2.276A2 2 0 013 14.382V9.618a2 2 0 011.447-1.894L9 10m6 0V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v4"
          />
        </svg>
      </button>
    </div>
  );
}
