"use client";

import React, { useState } from "react";

const TaxesPage: React.FC = () => {
  const [taxes, setTaxes] = useState([{ name: "PB", amount: 10 }]);
  const [newTax, setNewTax] = useState({ name: "", amount: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [error, setError] = useState({ name: false, amount: false });

  const handleCreateTax = () => {
    if (!newTax.name.trim() || !newTax.amount.trim()) {
      setError({
        name: !newTax.name.trim(),
        amount: !newTax.amount.trim(),
      });
      return;
    }

    if (editIndex !== null) {
      setTaxes((prevTaxes) =>
        prevTaxes.map((tax, i) =>
          i === editIndex ? { name: newTax.name, amount: Number(newTax.amount) } : tax
        )
      );
      setEditIndex(null);
    } else {
      setTaxes([...taxes, { name: newTax.name, amount: Number(newTax.amount) }]);
    }

    setNewTax({ name: "", amount: "" });
    setIsCreating(false);
    setError({ name: false, amount: false });
  };

  const handleEdit = (index: number) => {
    setNewTax({ name: taxes[index].name, amount: taxes[index].amount.toString() });
    setEditIndex(index);
    setIsCreating(true);
    setError({ name: false, amount: false });
  };

  const handleDelete = (index: number) => {
    setTaxes((prevTaxes) => prevTaxes.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Taxes</h1>
          <button
            onClick={() => {
              setIsCreating(true);
              setNewTax({ name: "", amount: "" });
              setEditIndex(null);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Tax
          </button>
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">
              {editIndex !== null ? "Edit Tax" : "Create Tax"}
            </h2>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Tax Name"
                value={newTax.name}
                onChange={(e) => {
                  setNewTax({ ...newTax, name: e.target.value });
                  setError({ ...error, name: false });
                }}
                className={`border p-2 rounded w-full ${error.name ? "border-red-500" : ""}`}
              />
              {error.name && <p className="text-red-500 text-sm">Please enter a tax name</p>}
            </div>
            <div className="mb-2">
              <input
                type="number"
                placeholder="Amount (%)"
                value={newTax.amount}
                onChange={(e) => {
                  setNewTax({ ...newTax, amount: e.target.value });
                  setError({ ...error, amount: false });
                }}
                className={`border p-2 rounded w-full ${error.amount ? "border-red-500" : ""}`}
              />
              {error.amount && <p className="text-red-500 text-sm">Please enter a valid amount</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTax}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                {editIndex !== null ? "Update Tax" : "Add Tax"}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTax({ name: "", amount: "" });
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

        {/* Taxes Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Amount (%)</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((tax, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{tax.name}</td>
                  <td className="p-2">{tax.amount}%</td>
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

export default TaxesPage;
