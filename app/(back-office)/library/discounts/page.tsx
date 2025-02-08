"use client";

import React, { useState } from "react";

const DiscountsPage: React.FC = () => {
  const [discounts, setDiscounts] = useState([
    { name: "Disc 10%", amount: 10, type: "%" },
  ]);

  const [newDiscount, setNewDiscount] = useState({
    name: "",
    amount: "",
    type: "%",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState({ name: "", amount: "" });

  const validateForm = () => {
    let valid = true;
    let newErrors = { name: "", amount: "" };

    if (!newDiscount.name.trim()) {
      newErrors.name = "Discount name is required";
      valid = false;
    }
    if (!newDiscount.amount.trim() || Number(newDiscount.amount) < 1) {
      newErrors.amount = "Insert amount value at least 1";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleCreateDiscount = () => {
    if (!validateForm()) return;

    if (editIndex !== null) {
      setDiscounts((prevDiscounts) =>
        prevDiscounts.map((discount, i) =>
          i === editIndex
            ? { ...newDiscount, amount: Number(newDiscount.amount) }
            : discount
        )
      );
      setEditIndex(null);
    } else {
      setDiscounts([...discounts, { ...newDiscount, amount: Number(newDiscount.amount) }]);
    }

    setNewDiscount({ name: "", amount: "", type: "%" });
    setIsCreating(false);
  };

  const handleEdit = (index: number) => {
    setNewDiscount({
      name: discounts[index].name,
      amount: discounts[index].amount.toString(),
      type: discounts[index].type,
    });
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setDiscounts((prevDiscounts) => prevDiscounts.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl">
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Discounts</h1>
          <button onClick={() => setIsCreating(true)} className="bg-blue-500 text-white px-4 py-2 rounded">
            Create Discount
          </button>
        </div>

        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">{editIndex !== null ? "Edit Discount" : "Create Discount"}</h2>

            {/* Discount Name Input */}
            <input
              type="text"
              placeholder="Discount Name"
              value={newDiscount.name}
              onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
              className={`border p-2 rounded w-full mb-2 ${errors.name ? "border-red-500" : ""}`}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

            {/* Discount Type Selection */}
            <div className="mb-2">
              <label className="block font-semibold">Input Configuration</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discountType"
                    value="%"
                    checked={newDiscount.type === "%"}
                    onChange={() => setNewDiscount({ ...newDiscount, type: "%" })}
                    className="mr-2"
                  />
                  Percentage (%)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discountType"
                    value="Rp"
                    checked={newDiscount.type === "Rp"}
                    onChange={() => setNewDiscount({ ...newDiscount, type: "Rp" })}
                    className="mr-2"
                  />
                  Fixed Amount (Rp)
                </label>
              </div>
            </div>

            {/* Discount Amount Input */}
            <div className="flex items-center border rounded w-full mb-2">
              <input
                type="number"
                placeholder="Amount"
                value={newDiscount.amount}
                onChange={(e) => setNewDiscount({ ...newDiscount, amount: e.target.value })}
                className={`p-2 flex-1 ${errors.amount ? "border-red-500" : ""}`}
              />
              <span className="bg-gray-200 px-4 py-2 rounded-r">{newDiscount.type}</span>
            </div>
            {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}

            <button onClick={handleCreateDiscount} className="bg-green-500 text-white px-4 py-2 rounded">
              {editIndex !== null ? "Update Discount" : "Add Discount"}
            </button>
          </div>
        )}

        {/* Discount Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Discount Name</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Outlet</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{discount.name}</td>
                  <td className="p-2">{discount.amount}</td>
                  <td className="p-2">{discount.type}</td>
                  <td className="p-2">Notarich Cafe</td>
                  <td className="p-2 text-center flex gap-2">
                    <button onClick={() => handleEdit(index)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(index)} className="bg-red-500 text-white px-3 py-1 rounded">
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

export default DiscountsPage;
