"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "loading">("idle");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token tidak valid atau sudah kadaluarsa.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Password dan konfirmasi tidak cocok.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/resetPassword/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }), // ✅ disesuaikan
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Password berhasil direset. Silakan login.");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus("error");
        setMessage(data.message || "Gagal mereset password.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Terjadi kesalahan saat mereset password.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/login2.png')" }}
    >
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg">
        <div className="text-center mb-1">
          <img
            src="/logo-notarich-transparent.png"
            alt="Logo"
            className="mx-auto h-20 md:h-24 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Reset Password</h2>

        {message && (
          <p className={`text-center mb-4 text-sm ${status === "success" ? "text-green-600" : "text-red-500"}`}>
            {message}
          </p>
        )}

        {status !== "success" && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700">
                Password Baru
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-8 text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-8 text-gray-600"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Memproses..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="text-sm text-center mt-4 text-blue-600 hover:underline">
          <a href="/login">Kembali ke Login</a>
        </div>
        <div className="my-4 text-center text-gray-500">@Notarich Cafe 2025</div>
      </div>
    </div>
  );
}
