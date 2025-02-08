"use client";

import React, { useState } from "react";

const ItemLibraryPage: React.FC = () => {
  const [items, setItems] = useState<
    {
      name: string;
      category: string;
      pricing: string;
      inStock: number;
      stockAlert: string;
      brand: string;
      description: string;
      priceDineIn: number;
      priceGoFood: number;
      modifiers: string[];
    }[]
  >([
    {
      name: "Air Mineral",
      category: "OTHERS",
      pricing: "Sales Type",
      inStock: -473,
      stockAlert: "1 Out",
      brand: "Unbranded",
      description: "",
      priceDineIn: 10000,
      priceGoFood: 12000,
      modifiers: [],
    },
  ]);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    brand: "",
    description: "",
    pricing: "",
    inStock: 0,
    stockAlert: "",
    priceDineIn: 0,
    priceGoFood: 0,
    modifiers: [] as string[],
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleCreateItem = () => {
    if (!newItem.name.trim() || !newItem.category.trim() || !newItem.pricing.trim()) {
      alert("All fields must be filled before saving.");
      return;
    }

    if (editIndex !== null) {
      setItems((prevItems) =>
        prevItems.map((item, i) => (i === editIndex ? { ...newItem } : item))
      );
      setEditIndex(null);
    } else {
      setItems([...items, { ...newItem }]);
    }

    setNewItem({
      name: "",
      category: "",
      brand: "",
      description: "",
      pricing: "",
      inStock: 0,
      stockAlert: "",
      priceDineIn: 0,
      priceGoFood: 0,
      modifiers: [],
    });

    setIsCreating(false);
  };

  const handleEdit = (index: number) => {
    setNewItem(items[index]);
    setEditIndex(index);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Item Library</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Item
          </button>
        </div>

        {isCreating && (
          <div className="bg-white p-4 rounded shadow-md mt-4">
            <h2 className="text-xl font-bold mb-2">{editIndex !== null ? "Edit Item" : "Create Item"}</h2>
            <input
              type="text"
              placeholder="Product Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            >
              <option value="">Select Category</option>
              <option value="OTHERS">OTHERS</option>
              <option value="PASTRY">PASTRY</option>
              <option value="REFRESHER">REFRESHER</option>
              <option value="SNACK">SNACK</option>
            </select>
            <input
              type="text"
              placeholder="Brand"
              value={newItem.brand}
              onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="text"
              placeholder="Pricing"
              value={newItem.pricing}
              onChange={(e) => setNewItem({ ...newItem, pricing: e.target.value })}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="number"
              placeholder="Dine In Price"
              value={newItem.priceDineIn}
              onChange={(e) => setNewItem({ ...newItem, priceDineIn: Number(e.target.value) })}
              className="border p-2 rounded w-full mb-2"
            />
            <input
              type="number"
              placeholder="GoFood Price"
              value={newItem.priceGoFood}
              onChange={(e) => setNewItem({ ...newItem, priceGoFood: Number(e.target.value) })}
              className="border p-2 rounded w-full mb-2"
            />
            <label className="block mb-2">Modifiers:</label>
            <select
              multiple
              value={newItem.modifiers}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  modifiers: Array.from(e.target.selectedOptions, (option) => option.value),
                })
              }
              className="border p-2 rounded w-full mb-2"
            >
              <option value="Ice Level">Ice Level</option>
              <option value="Spicy Level">Spicy Level</option>
              <option value="Sauce">Sauce</option>
              <option value="Sugar Level">Sugar Level</option>
              <option value="Egg">Egg</option>
            </select>
            <button onClick={handleCreateItem} className="bg-green-500 text-white px-4 py-2 rounded">
              {editIndex !== null ? "Update Item" : "Add Item"}
            </button>
          </div>
        )}

        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Pricing</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{item.name}</td>
                  <td className="p-2">{item.category}</td>
                  <td className="p-2">{item.pricing}</td>
                  <td className="p-2">{item.inStock}</td>
                  <td className="p-2 text-center flex gap-2">
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

export default ItemLibraryPage;
