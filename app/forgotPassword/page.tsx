"use client";

import { useState, FormEvent } from "react";
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "loading">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Instruksi reset password telah dikirim ke email Anda.");
      } else {
        setStatus("error");
        setMessage(data.message || "Gagal mengirim email reset password.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Terjadi kesalahan saat mengirim permintaan.");
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/login2.webp')" }}
    >
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg">
        <div className="text-center mb-1">
          <Image
            src="/logo-notarich-transparent.webp"
            alt="Logo"
            width={160}
            height={120}
            priority // <-- penting untuk LCP image
            className="mx-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Lupa Password</h2>

        {message && (
          <p className={`text-center mb-4 text-sm ${
            status === "success" ? "text-green-600" : "text-red-500"
          }`}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Masukkan Email
            </label>
            <input
              type="email"
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Mengirim..." : "Kirim Email Reset"}
          </button>
        </form>

        <div className="text-sm text-center mt-4 text-blue-600 hover:underline">
          <a href="/login">Kembali ke Login</a>
        </div>
        <div className="my-4 text-center text-gray-500">@Notarich Cafe 2025</div>
      </div>
    </div>
  );
}
