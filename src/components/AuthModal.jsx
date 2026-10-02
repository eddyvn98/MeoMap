import React, { useState } from "react";
import { localApi } from "../localClient";

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error: signInError } = await localApi.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Ensure profile exists after login
      if (data?.user) {
        const { data: existingProfile } = await localApi
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!existingProfile) {
          await localApi.from("profiles").insert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          });
        }
      }

      setMessage("Đăng nhập thành công!");
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 1000);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await localApi.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Create profile immediately after signup
      if (data?.user) {
        await localApi.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          display_name: name || data.user.email?.split('@')[0] || 'User',
        });
      }

      setMessage("Tạo tài khoản thành công! Vui lòng kiểm tra email xác nhận.");
      setTimeout(() => {
        resetForm();
        setMode("login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Tạo tài khoản thất bại");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setMessage("");
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50001,
      }}
      onClick={() => {
        onClose();
        resetForm();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "450px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </h2>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
          <button
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: mode === "login" ? "transparent" : "transparent",
              borderBottom: mode === "login" ? "2px solid #3b82f6" : "none",
              color: mode === "login" ? "#3b82f6" : "#6b7280",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: mode === "signup" ? "transparent" : "transparent",
              borderBottom: mode === "signup" ? "2px solid #3b82f6" : "none",
              color: mode === "signup" ? "#3b82f6" : "#6b7280",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            Đăng ký
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#dcfce7",
              color: "#16a34a",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
          {mode === "signup" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Họ tên
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ tên của bạn"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
