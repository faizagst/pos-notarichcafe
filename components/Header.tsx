'use client';
import React, { useEffect, useState, useRef } from 'react';
import { LucideEye, LucideEyeOff } from "lucide-react";

const Header = () => {
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser({
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
        });
      }
    };
    fetchUser();
  }, []);

  // Klik di luar dropdown → tutup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  //buat ganti password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changing, setChanging] = useState(false);

  // Toggle untuk visibility password
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fungsi untuk reset input password
  const resetPasswordFields = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  return (
    <header className="flex justify-between items-center bg-white text-black p-4 shadow-md">
      <h1 className="text-xl font-bold">Selamat Datang</h1>

      {user && (
        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-md transition"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <img src="/logo.png" alt="User" className="w-10 h-10 rounded-full" />
            <div className="text-left hidden sm:block">
              <div className="font-semibold">{user.name || user.username}</div>
              <div className="text-xs text-gray-600">{user.role}</div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Ganti Password
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}

          {showChangePassword && (
            <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
                <h2 className="text-xl font-bold mb-4">Ganti Password</h2>
                {passwordError && <p className="text-red-500 text-sm mb-2">{passwordError}</p>}
                {passwordSuccess && <p className="text-green-600 text-sm mb-2">{passwordSuccess}</p>}

                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    placeholder="Password Lama"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full mb-3 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-2"
                  >
                   {showOldPassword ? <LucideEyeOff/> : <LucideEye/>}
                   </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password Baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full mb-3 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2"
                  >
                    {showNewPassword ? <LucideEyeOff/> : <LucideEye/>}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi Password Baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2"
                  >
                    {showConfirmPassword ? <LucideEyeOff/> : <LucideEye/>}
                  </button>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      resetPasswordFields();
                      setShowChangePassword(false);
                    }}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      setPasswordError("");
                      setPasswordSuccess("");
                      if (!oldPassword || !newPassword || !confirmPassword) {
                        setPasswordError("Semua field wajib diisi");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPasswordError("Password baru dan konfirmasi tidak cocok");
                        return;
                      }
                      setChanging(true);
                      const res = await fetch("/api/auth/changePassword", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ oldPassword, newPassword }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        setPasswordError(data.message || "Gagal mengganti password");
                      } else {
                        setPasswordSuccess("Password berhasil diganti");
                        resetPasswordFields();
                        setTimeout(() => {
                          setShowChangePassword(false);
                        }, 1500);
                      }
                      setChanging(false);
                    }}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    disabled={changing}
                  >
                    {changing ? "Memproses..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
