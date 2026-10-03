import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localApi } from "../localClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await localApi.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      navigate("/account");
    } catch (loginError) {
      setError(loginError.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Đăng nhập</h2>
      <form onSubmit={handleLogin} style={{ maxWidth: 420 }}>
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
          <label>Mật khẩu</label>
          <br />
          <input
            type="password"
            required
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
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, boxSizing: "border-box" };
