import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localApi } from "../localClient";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8 || password.length > 128) {
      setError("Mật khẩu phải từ 8 đến 128 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await localApi.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      alert("Đã tạo tài khoản local thành công.");
      navigate("/account");
    } catch (registerError) {
      setError(registerError.message || "Không thể tạo tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Đăng ký</h2>
      <form onSubmit={handleRegister} style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <br />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Mật khẩu (8–128 ký tự)</label>
          <br />
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            background: "#ff7f32",
            color: "#fff",
            border: "none",
            borderRadius: 6,
          }}
        >
          {loading ? "Đang tạo..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, boxSizing: "border-box" };
