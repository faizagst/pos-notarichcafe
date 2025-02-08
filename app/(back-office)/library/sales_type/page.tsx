"use client";

import React, { useState } from "react";

const SalesTypePage: React.FC = () => {
  const [salesTypes, setSalesTypes] = useState([
    { name: "Dine in", gratuityApplied: 1, status: "Active" },
    { name: "Gofood", gratuityApplied: 0, status: "Active" },
  ]);

  const [gratuities] = useState([
    { name: "Service Charge", amount: 2 },
  ]);

  const [newSalesType, setNewSalesType] = useState({
    name: "",
    gratuity: "",
    status: "Active",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleCreateSalesType = () => {
    if (!newSalesType.name.trim()) {
      alert("Sales Type Name is required!");
      return;
    }

    if (editIndex !== null) {
      setSalesTypes((prevSalesTypes) =>
        prevSalesTypes.map((type, i) =>
          i === editIndex
            ? { ...newSalesType, gratuityApplied: newSalesType.gratuity ? 1 : 0 }
            : type
        )
      );
      setEditIndex(null);
    } else {
      setSalesTypes([
        ...salesTypes,
        { ...newSalesType, gratuityApplied: newSalesType.gratuity ? 1 : 0 },
      ]);
    }

    setNewSalesType({ name: "", gratuity: "", status: "Active" });
    setIsCreating(false);
  };

  const handleEdit = (index: number) => {
    setNewSalesType({
      name: salesTypes[index].name,
      gratuity: salesTypes[index].gratuityApplied ? "Service Charge" : "",
      status: salesTypes[index].status,
    });
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setSalesTypes((prevSalesTypes) => prevSalesTypes.filter((_, i) => i !== index));
  };

  const toggleStatus = (index: number) => {
    setSalesTypes((prevSalesTypes) =>
      prevSalesTypes.map((type, i) =>
        i === index
          ? { ...type, status: type.status === "Active" ? "Inactive" : "Active" }
          : type
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl">
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Sales Type</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Sales Type
          </button>
        </div>

        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">
              {editIndex !== null ? "Edit Sales Type" : "Create Sales Type"}
            </h2>
            <input
              type="text"
              placeholder="Sales Type Name (e.g. Dine In)"
              value={newSalesType.name}
              onChange={(e) =>
                setNewSalesType({ ...newSalesType, name: e.target.value })
              }
              className="border p-2 rounded w-full mb-2"
              required
            />
            <h3 className="text-md font-bold mb-1">Assign Gratuity</h3>
            {gratuities.map((gratuity, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gratuity"
                  value={gratuity.name}
                  checked={newSalesType.gratuity === gratuity.name}
                  onChange={(e) =>
                    setNewSalesType({ ...newSalesType, gratuity: e.target.value })
                  }
                  className="cursor-pointer"
                />
                <span>{gratuity.name} ({gratuity.amount}%)</span>
              </div>
            ))}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSalesType}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                {editIndex !== null ? "Update Sales Type" : "Add Sales Type"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Gratuity Applied</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesTypes.map((type, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{type.name}</td>
                  <td className="p-2">{type.gratuityApplied} gratuity</td>
                  <td
                    className={`p-2 font-semibold ${
                      type.status === "Active" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {type.status}
                  </td>
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
                    <button
                      onClick={() => toggleStatus(index)}
                      className={`${
                        type.status === "Active"
                          ? "bg-red-500"
                          : "bg-green-500"
                      } text-white px-3 py-1 rounded`}
                    >
                      {type.status === "Active" ? "Deactivate" : "Activate"}
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

export default SalesTypePage;
