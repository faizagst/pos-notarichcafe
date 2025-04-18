"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function RegisterPage() {
  // ======================
  // STATE & HOOKS
  // ======================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Token invite
  const [inviteTokenValid, setInviteTokenValid] = useState<boolean | null>(null);
  const [inviteEmployee, setInviteEmployee] = useState<any>(null);

  // Menandakan apakah ini mode invite
  const isInviteFlow = !!(inviteTokenValid && inviteEmployee);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromURL = searchParams?.get("token");

  // ======================
  // EFFECT: Verifikasi Token Invite
  // ======================
  useEffect(() => {
    if (!tokenFromURL) {
      setInviteTokenValid(null);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/verifyInvite?token=${tokenFromURL}`);
        if (!res.ok) {
          setInviteTokenValid(false);
          return;
        }
        const data = await res.json();
        setInviteTokenValid(true);
        setInviteEmployee(data.employee);
      } catch (error) {
        setInviteTokenValid(false);
      }
    };

    verifyToken();
  }, [tokenFromURL]);

  // ======================
  // EFFECT: Isi Email & Role Jika Invite Flow
  // ======================
  useEffect(() => {
    if (inviteEmployee) {
      setRole(inviteEmployee?.roleName || "");
    }
  }, [inviteEmployee]);

  // ======================
  // VALIDASI INPUT
  // ======================
  const validateInput = () => {
    if (username.length < 3 || username.length > 20) {
      toast.error("Username harus 3-20 karakter");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password harus minimal 6 karakter");
      return false;
    }
    if (!role) {
      toast.error("Role belum dipilih");
      return false;
    }
    return true;
  };

  // ======================
  // SUBMIT REGISTER
  // ======================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateInput()) return;
    setLoading(true);

    try {
      // Kirim data ke /api/register
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          token: tokenFromURL, // Penting untuk invite flow
        }),
      });

      const data = await res.json();
      console.log("Response dari server:", data);

      if (res.ok) {
        toast.success("Registrasi berhasil, silakan login!");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setErrorMessage(data.message || "Registrasi gagal");
        toast.error(data.message || "Registrasi gagal");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan, coba lagi nanti");
    } finally {
      setLoading(false);
    }
  };

  // Jika token invite masih diverifikasi
  if (tokenFromURL && inviteTokenValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Memeriksa token...</p>
      </div>
    );
  }

  // Jika token invite invalid
  if (tokenFromURL && inviteTokenValid === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-red-500">Token undangan tidak valid atau sudah digunakan.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/login2.png')" }}>
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Register</h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500">
            Log In
          </a>
        </p>
        {errorMessage && <p className="text-center text-red-500 mb-4">{errorMessage}</p>}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Email (Diisi otomatis dari data invite) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={inviteEmployee?.email || ""}
              className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-black"
              readOnly
            />
          </div>

          {/* Password */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute top-9 right-2 text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* Role (diambil dari data invite) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <input
              type="text"
              value={role}
              className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-black"
              readOnly
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            {loading ? "Processing..." : "Register"}
          </button>
        </form>

        <div className="my-4 text-center text-gray-500">OR</div>
        <button className="text-black w-full flex items-center justify-center p-2 border rounded-lg hover:bg-gray-200 transition">
          <FcGoogle className="text-xl mr-2" /> Register with Google
        </button>
      </div>
    </div>
  );
}