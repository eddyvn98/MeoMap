import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * DEPRECATED: This page redirects to MyWalletPage
 * The new wallet system uses MyWalletPage with 2 balance types:
 * - Balance_COC (deposits - non-withdrawable)
 * - Balance_THUONG (rewards - withdrawable)
 */
export default function WalletPage() {
  const navigate = useNavigate();

  // Redirect to new wallet page
  useEffect(() => {
    navigate("/my-wallet", { replace: true });
  }, [navigate]);

  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <p>Đang chuyển sang trang ví mới...</p>
    </div>
  );
}
