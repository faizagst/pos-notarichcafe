"use client";

import React, { useState } from "react";

const ModifiersPage: React.FC = () => {
  const modifiers = [
    { name: "Ice Level", options: "Less Ice, Normal Ice, Extra Ice" },
    { name: "Level Pedas", options: "Pedes, Sedang, Tidak Pedas" },
    { name: "Saus", options: "Mushroom, Blackpaper" },
    { name: "Sugar Level", options: "Less Sugar, Normal Sugar, Extra Sugar" },
    { name: "Telur", options: "Matang, Setengah Matang" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">    
      {/* Main Content */}
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Modifiers</h1>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Create Modifier</button>
        </div>

        {/* Modifiers Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Modifier Set Name</th>
                <th className="p-2 text-left">Options</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {modifiers.map((modifier, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{modifier.name}</td>
                  <td className="p-2">{modifier.options}</td>
                  <td className="p-2 text-center">
                    <button className="bg-blue-500 text-white px-3 py-1 rounded">Apply Set Item</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModifiersPage;