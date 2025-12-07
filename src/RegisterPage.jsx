// src/pages/RegisterPage.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg(error.message || "Đăng ký thất bại.");
      return;
    }

    // Nếu bạn bật auto-confirm email, user dùng được luôn
    setSuccessMsg("Đăng ký thành công, hãy đăng nhập.");
    // Điều hướng sang login sau 1 chút
    setTimeout(() => navigate("/login"), 1000);
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Đăng ký</h2>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>
      </form>

      {errorMsg && <p style={{ color: "red", marginTop: 10 }}>{errorMsg}</p>}
      {successMsg && (
        <p style={{ color: "green", marginTop: 10 }}>{successMsg}</p>
      )}

      <p style={{ marginTop: 16 }}>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
