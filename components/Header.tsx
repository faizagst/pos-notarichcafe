'use client';
import React, { useEffect, useState, useRef } from 'react';

const Header = () => {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser({
          username: data.user.username,
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
              <div className="font-semibold">{user.username}</div>
              <div className="text-xs text-gray-600">{user.role}</div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
