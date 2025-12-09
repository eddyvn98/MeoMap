import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message || "Register failed");
        return;
      }
      // registration ok — you may require email confirmation depending on project
      alert('Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận (nếu có).');
      navigate('/login');
    } catch (err) {
      setError(err.message || String(err));
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
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Mật khẩu</label>
          <br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: 10, background: '#ff7f32', color: '#fff', border: 'none', borderRadius: 6 }}>
          {loading ? 'Đang tạo...' : 'Đăng ký'}
        </button>
      </form>
    </div>
  );
}
