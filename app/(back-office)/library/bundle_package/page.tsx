"use client";

import React, { useState } from "react";

const BundlePackagePage: React.FC = () => {
  const [bundles, setBundles] = useState([
    { name: "Bakso Kuah + Classic Tea", items: "Bakso Kuah, Classic Black Tea", pricing: "Rp. 33.000", outlet: "Notarich Cafe", status: "Active" },
    { name: "Beef Teriyaki + Classic Tea", items: "Beef Teriyaki, Classic Black Tea", pricing: "Rp. 41.000", outlet: "Notarich Cafe", status: "Active" },
    { name: "Chicken Cordon Blue + A...", items: "Chicken Cordon Blue, All Variants", pricing: "Rp. 45.000", outlet: "Notarich Cafe", status: "Inactive" },
    { name: "Chicken Parmigiana + All ...", items: "Chicken Parmigiana, Classic Black Tea", pricing: "Rp. 45.000", outlet: "Notarich Cafe", status: "Active" },
    { name: "Chicken Salted Egg + Cl...", items: "Chicken Skin Salted Egg, Classic Black Tea", pricing: "Rp. 36.000", outlet: "Notarich Cafe", status: "Active" },
    { name: "Croissant + All Variant Cof...", items: "Croissant, All Variant Coffee", pricing: "Rp. 30.000", outlet: "Notarich Cafe", status: "Inactive" },
  ]);

  const [newBundle, setNewBundle] = useState({ name: "", items: "", pricing: "", outlet: "Notarich Cafe", status: "Active" });
  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const toggleStatus = (index: number) => {
    setBundles((prevBundles) =>
      prevBundles.map((bundle, i) =>
        i === index ? { ...bundle, status: bundle.status === "Active" ? "Inactive" : "Active" } : bundle
      )
    );
  };

  const handleCreateBundle = () => {
    if (editIndex !== null) {
      setBundles((prevBundles) =>
        prevBundles.map((bundle, i) => (i === editIndex ? newBundle : bundle))
      );
      setEditIndex(null);
    } else {
      setBundles([...bundles, newBundle]);
    }
    setNewBundle({ name: "", items: "", pricing: "", outlet: "Notarich Cafe", status: "Active" });
    setIsCreating(false);
  };

  const handleEdit = (index: number) => {
    setNewBundle(bundles[index]);
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setBundles((prevBundles) => prevBundles.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      {/* Main Content */}
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Bundle Package</h1>
          <button onClick={() => setIsCreating(true)} className="bg-blue-500 text-white px-4 py-2 rounded">Create Bundle</button>
        </div>

        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">{editIndex !== null ? "Edit Bundle" : "Create Bundle"}</h2>
            <input
              type="text"
              placeholder="Bundle Name"
              value={newBundle.name}
              onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="text"
              placeholder="Items"
              value={newBundle.items}
              onChange={(e) => setNewBundle({ ...newBundle, items: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="text"
              placeholder="Pricing"
              value={newBundle.pricing}
              onChange={(e) => setNewBundle({ ...newBundle, pricing: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <button onClick={handleCreateBundle} className="bg-green-500 text-white px-4 py-2 rounded">{editIndex !== null ? "Update Bundle" : "Add Bundle"}</button>
          </div>
        )}

        {/* Bundles Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Items</th>
                <th className="p-2 text-left">Pricing</th>
                <th className="p-2 text-left">Outlet</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{bundle.name}</td>
                  <td className="p-2">{bundle.items}</td>
                  <td className="p-2">{bundle.pricing}</td>
                  <td className="p-2">{bundle.outlet}</td>
                  <td className={`p-2 font-semibold ${bundle.status === "Active" ? "text-green-600" : "text-red-600"}`}>{bundle.status}</td>
                  <td className="p-2 text-center flex gap-2">
                    <button onClick={() => toggleStatus(index)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded">Status</button>
                    <button onClick={() => handleEdit(index)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                    <button onClick={() => handleDelete(index)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
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

export default BundlePackagePage;
