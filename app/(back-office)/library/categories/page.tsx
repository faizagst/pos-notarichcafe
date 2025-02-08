"use client";

import React from "react";

const CategoriesPage: React.FC = () => {
  const categories = [
    { name: "Add on (Beverages)", items: "1 items" },
    { name: "Add on (Food)", items: "2 items" },
    { name: "ARTISAN TEA", items: "3 items" },
    { name: "CLASSIC COFFEE", items: "12 items" },
    { name: "COCORICH", items: "6 items" },
    { name: "Extra", items: "1 items" },
    { name: "FRAPPE", items: "5 items" },
    { name: "ICED TEA", items: "4 items" },
    { name: "JUICE", items: "3 items" },
    { name: "MAIN COURSE", items: "14 items" },
    { name: "OTHERS", items: "2 items" },
    { name: "PASTRY", items: "4 items" },
    { name: "REFRESHER", items: "7 items" },
    { name: "REFRESHER BY ASTERY", items: "4 items" },
    { name: "SNACK", items: "9 items" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      {/* Main Content */}
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Categories</h1>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Create Category</button>
        </div>

        {/* Categories Table */}
        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Category Name</th>
                <th className="p-2 text-left">Item Stocks</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{category.name}</td>
                  <td className="p-2">{category.items}</td>
                  <td className="p-2 text-center">
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded">Assign To Item</button>
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

export default CategoriesPage;
