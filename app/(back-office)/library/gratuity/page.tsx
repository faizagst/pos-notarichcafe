"use client";

import React, { useState } from "react";

const GratuityPage: React.FC = () => {
  const [gratuities, setGratuities] = useState([
    { name: "Service Charge", amount: 2 },
  ]);

  const [newGratuity, setNewGratuity] = useState({ name: "", amount: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [error, setError] = useState({ name: false, amount: false });

  const handleCreateGratuity = () => {
    if (!newGratuity.name.trim() || !newGratuity.amount.trim()) {
      setError({
        name: !newGratuity.name.trim(),
        amount: !newGratuity.amount.trim(),
      });
      return;
    }

    if (editIndex !== null) {
      setGratuities((prevGratuities) =>
        prevGratuities.map((gratuity, i) =>
          i === editIndex
            ? { ...newGratuity, amount: Number(newGratuity.amount) }
            : gratuity
        )
      );
      setEditIndex(null);
    } else {
      setGratuities([...gratuities, { ...newGratuity, amount: Number(newGratuity.amount) }]);
    }

    setNewGratuity({ name: "", amount: "" });
    setIsCreating(false);
    setError({ name: false, amount: false });
  };

  const handleEdit = (index: number) => {
    const gratuity = gratuities[index];
    setNewGratuity({ name: gratuity.name, amount: gratuity.amount.toString() });
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setGratuities((prevGratuities) => prevGratuities.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Gratuity</h1>
          <button
            onClick={() => {
              setIsCreating(true);
              setNewGratuity({ name: "", amount: "" });
              setEditIndex(null);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Gratuity
          </button>
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">{editIndex !== null ? "Edit Gratuity" : "Create Gratuity"}</h2>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Gratuity Name"
                value={newGratuity.name}
                onChange={(e) => {
                  setNewGratuity({ ...newGratuity, name: e.target.value });
                  setError({ ...error, name: false });
                }}
                className={`border p-2 rounded w-full ${error.name ? "border-red-500" : ""}`}
              />
              {error.name && <p className="text-red-500 text-sm">Please enter a gratuity name</p>}
            </div>
            <div className="mb-2">
              <input
                type="number"
                placeholder="Amount"
                value={newGratuity.amount}
                onChange={(e) => {
                  setNewGratuity({ ...newGratuity, amount: e.target.value });
                  setError({ ...error, amount: false });
                }}
                className={`border p-2 rounded w-full ${error.amount ? "border-red-500" : ""}`}
              />
              {error.amount && <p className="text-red-500 text-sm">Please enter a valid amount</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateGratuity}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                {editIndex !== null ? "Update Gratuity" : "Add Gratuity"}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewGratuity({ name: "", amount: "" });
                  setEditIndex(null);
                  setError({ name: false, amount: false });
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Gratuity List Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {gratuities.map((gratuity, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{gratuity.name}</td>
                  <td className="p-2">{gratuity.amount}%</td>
                  <td className="p-2 text-center flex gap-2">
                    <button
                      onClick={() => handleEdit(index)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
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

export default GratuityPage;
