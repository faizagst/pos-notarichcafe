"use client";

import React, { useState } from "react";

const PromoPage: React.FC = () => {
  const [promos, setPromos] = useState([
    { 
      name: "Promo 1", 
      type: "Discount per Item", 
      period: "11 Oct 2023 - 10 Oct 2024", 
      outlet: "Notarich Cafe", 
      status: "Inactive",
      discountAmount: "10%",
      requirements: "Buy 2 get 10% off",
      configuration: "Applies in multiple"
    }
  ]);

  const [newPromo, setNewPromo] = useState({
    name: "",
    type: "Discount per Item",
    period: "",
    outlet: "Notarich Cafe",
    status: "Active",
    discountAmount: "",
    requirements: "",
    configuration: "",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleCreatePromo = () => {
    if (!newPromo.name.trim()) {
      alert("Promo Name is required!");
      return;
    }

    if (editIndex !== null) {
      setPromos((prevPromos) =>
        prevPromos.map((promo, i) => (i === editIndex ? newPromo : promo))
      );
      setEditIndex(null);
    } else {
      setPromos([...promos, newPromo]);
    }

    setNewPromo({
      name: "",
      type: "Discount per Item",
      period: "",
      outlet: "Notarich Cafe",
      status: "Active",
      discountAmount: "",
      requirements: "",
      configuration: "",
    });

    setIsCreating(false);
  };

  const handleEdit = (index: number) => {
    setNewPromo(promos[index]);
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setPromos((prevPromos) => prevPromos.filter((_, i) => i !== index));
  };

  const toggleStatus = (index: number) => {
    setPromos((prevPromos) =>
      prevPromos.map((promo, i) =>
        i === index ? { ...promo, status: promo.status === "Active" ? "Inactive" : "Active" } : promo
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Promo</h1>
          <button 
            onClick={() => setIsCreating(true)} 
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Promo
          </button>
        </div>

        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">{editIndex !== null ? "Edit Promo" : "Create Promo"}</h2>
            <input 
              type="text" 
              placeholder="Promo Name" 
              value={newPromo.name} 
              onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            />
            <select 
              value={newPromo.type} 
              onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            >
              <option value="Discount per Item">Discount per Item</option>
              <option value="Free Item">Free Item</option>
              <option value="Moka Order Price Cuts">Moka Order Price Cuts</option>
            </select>
            <input 
              type="text" 
              placeholder="Time Period" 
              value={newPromo.period} 
              onChange={(e) => setNewPromo({ ...newPromo, period: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            />
            <input 
              type="number" 
              placeholder="Discount Amount" 
              value={newPromo.discountAmount} 
              onChange={(e) => setNewPromo({ ...newPromo, discountAmount: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            />
            <input 
              type="text" 
              placeholder="Requirements" 
              value={newPromo.requirements} 
              onChange={(e) => setNewPromo({ ...newPromo, requirements: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            />
            <input 
              type="text" 
              placeholder="Configuration" 
              value={newPromo.configuration} 
              onChange={(e) => setNewPromo({ ...newPromo, configuration: e.target.value })} 
              className="border p-2 rounded w-full mb-2"
            />
            <button 
              onClick={handleCreatePromo} 
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              {editIndex !== null ? "Update Promo" : "Add Promo"}
            </button>
          </div>
        )}

        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Promo Name</th>
                <th className="p-2 text-left">Time Period</th>
                <th className="p-2 text-left">Outlet</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{promo.name}</td>
                  <td className="p-2">{promo.period}</td>
                  <td className="p-2">{promo.outlet}</td>
                  <td className={`p-2 ${promo.status === "Active" ? "text-green-500" : "text-red-500"}`}>
                    {promo.status}
                  </td>
                  <td className="p-2 text-center flex gap-2">
                    <button onClick={() => handleEdit(index)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(index)} className="bg-red-500 text-white px-3 py-1 rounded">
                      Delete
                    </button>
                    <button 
                      onClick={() => toggleStatus(index)} 
                      className={`px-3 py-1 rounded ${promo.status === "Active" ? "bg-gray-500 text-white" : "bg-green-500 text-white"}`}
                    >
                      {promo.status === "Active" ? "Deactivate" : "Activate"}
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

export default PromoPage;
