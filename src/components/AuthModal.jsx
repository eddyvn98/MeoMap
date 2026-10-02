import { useState } from "react";
import { localApi } from "../localClient";

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setMessage("");
  };

  const close = () => {
    onClose();
    resetForm();
  };

  const ensureProfile = async (user, displayName) => {
    if (!user) return;
    const { data: existingProfile } = await localApi
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      await localApi.from("profiles").insert({
        id: user.id,
        email: user.email,
        display_name:
          displayName ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "User",
      });
    }
  };

  const finishSuccess = (text, delay) => {
    setMessage(text);
    setTimeout(() => {
      onSuccess?.();
      resetForm();
    }, delay);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error: signInError } =
        await localApi.auth.signInWithPassword({ email, password });

      if (signInError) throw signInError;
      await ensureProfile(data?.user);
      finishSuccess("Đăng nhập thành công!", 1000);
    } catch (loginError) {
      setError(loginError.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
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
        options: { data: { full_name: name } },
      });

      if (signUpError) throw signUpError;
      await ensureProfile(data?.user, name);
      finishSuccess("Tạo tài khoản local thành công!", 800);
    } catch (signupError) {
      setError(signupError.message || "Tạo tài khoản thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full box-border rounded-md border border-gray-300 px-2.5 py-2.5 text-sm";
  const tabClass = (value) =>
    `flex-1 border-0 bg-transparent p-3 text-sm font-medium ${
      mode === value
        ? "border-b-2 border-blue-500 text-blue-500"
        : "text-gray-500"
    }`;

  return (
    <div
      className="fixed inset-0 z-[50001] flex items-center justify-center bg-black/50"
      onClick={close}
    >
      <div
        className="w-[90%] max-w-[450px] rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-xl font-bold">
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </h2>
          <button
            type="button"
            onClick={close}
            className="border-0 bg-transparent p-0 text-2xl text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-2 border-b border-gray-200">
          {[
            ["login", "Đăng nhập"],
            ["signup", "Đăng ký"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError("");
                setMessage("");
              }}
              className={tabClass(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-600">
            {message}
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
          {mode === "signup" && (
            <Field label="Họ tên">
              <input
                className={inputClass}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nhập họ tên của bạn"
                required
              />
            </Field>
          )}

          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
            />
          </Field>

          <Field label="Mật khẩu">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </Field>

          {mode === "signup" && (
            <Field label="Xác nhận mật khẩu">
              <input
                className={inputClass}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border-0 bg-blue-500 p-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
