import React from 'react';

const Header = () => {
  return (
    <header className="flex justify-between items-center bg-white text-black p-4">
      <h1 className="text-xl font-bold"></h1>
      <div className="flex items-center">
        <img
          src="/logo.png"
          alt="User"
          className="w-10 h-10 rounded-full mr-4"
        />
        <div>
          <h2 className="font-semibold">Notarich Cafe</h2>
          <p className="text-sm">Manager</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
