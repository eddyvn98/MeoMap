import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import AuthModalView from './views/AuthModalView';

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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Ensure profile exists after login
      if (data?.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!existingProfile) {
          await supabase.from("profiles").insert({
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
      const { data, error: signUpError } = await supabase.auth.signUp({
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
        await supabase.from("profiles").insert({
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

  return <AuthModalView scope={{
    isOpen,
    onClose,
    onSuccess,
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    loading,
    setLoading,
    error,
    setError,
    message,
    setMessage,
    handleLogin,
    handleSignup,
    resetForm,
  }} />;
};

export default AuthModal;
