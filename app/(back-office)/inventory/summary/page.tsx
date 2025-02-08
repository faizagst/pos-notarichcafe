"use client";

import React, { useState } from "react";
import { saveAs } from "file-saver";

const SummaryPage: React.FC = () => {
  const [category, setCategory] = useState("Item Library");
  const [data, setData] = useState([
    { name: "Air Mineral", category: "OTHERS", beginning: -473, purchaseOrder: 0, sales: 0, transfer: 0, adjustment: 0, ending: -473 },
    { name: "Chicken Skin Salted Egg", category: "MAIN COURSE", beginning: -64, purchaseOrder: 0, sales: 0, transfer: 0, adjustment: 0, ending: -64 },
    { name: "Acar", category: "Uncategorized", beginning: -11570, purchaseOrder: 0, sales: 0, transfer: 0, adjustment: 0, ending: -11580 },
  ]);

  const exportToCSV = () => {
    const headers = "Name,Category,Beginning,Purchase Order,Sales,Transfer,Adjustment,Ending\n";
    const csvRows = data.map(item => `${item.name},${item.category},${item.beginning},${item.purchaseOrder},${item.sales},${item.transfer},${item.adjustment},${item.ending}`).join("\n");
    const csvString = headers + csvRows;
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "summary_data.csv");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-700">Summary</h1>
          <button onClick={exportToCSV} className="bg-blue-500 text-white px-4 py-2 rounded">Export</button>
        </div>

        <div className="flex justify-between my-4">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded">
            <option value="Item Library">Item Library</option>
            <option value="Ingredients">Ingredients</option>
          </select>
        </div>

        <div className="mt-4 bg-white p-4 rounded shadow-md">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name - Variant</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Beginning</th>
                <th className="p-2 text-left">Purchase Order</th>
                <th className="p-2 text-left">Sales</th>
                <th className="p-2 text-left">Transfer</th>
                <th className="p-2 text-left">Adjustment</th>
                <th className="p-2 text-left">Ending</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-semibold">{item.name}</td>
                  <td className="p-2">{item.category}</td>
                  <td className="p-2">{item.beginning}</td>
                  <td className="p-2">{item.purchaseOrder}</td>
                  <td className="p-2">{item.sales}</td>
                  <td className="p-2">{item.transfer}</td>
                  <td className="p-2">{item.adjustment}</td>
                  <td className="p-2">{item.ending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
