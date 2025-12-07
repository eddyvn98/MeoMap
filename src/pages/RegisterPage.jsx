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

    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) {
        setErrorMsg(signUpError.message || "Đăng ký thất bại.");
        setLoading(false);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setErrorMsg("Không lấy được user id.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          role: "user",
        },
      ]);

      if (profileError) {
        console.error("Tạo profile lỗi:", profileError);
        setErrorMsg("Đăng ký thành công nhưng tạo profile lỗi.");
        setLoading(false);
        return;
      }

      setSuccessMsg(
        "Đăng ký thành công! Kiểm tra email để confirm và đã tạo profile."
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg("Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Tạo tài khoản
        </h2>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email..."
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              minLength={6}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự..."
              required
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="text-red-600 text-sm font-medium">{errorMsg}</div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="text-green-600 text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-center bg-orange-500 text-white font-semibold rounded-lg shadow hover:bg-orange-600 transition disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : "Tạo tài khoản"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-700">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-orange-600 font-semibold hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
