import React from "react";

const ItemLibraryPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <div className="bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-700">Item Library</h1>

        {/* Toolbar */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-2 border rounded bg-gray-100">🏠 Notarich Cafe</span>
            <select className="border p-2 rounded text-gray-700">
              <option>All Categories</option>
            </select>
            <select className="border p-2 rounded text-gray-700">
              <option>All Inventory</option>
            </select>
            <input type="text" placeholder="Search" className="border p-2 rounded text-gray-700" />
          </div>
          <div>
            <span className="text-gray-700">Total: 79</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded ml-2">Import / Export</button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded ml-2">Create Item</button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full mt-4 border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Pricing</th>
              <th className="p-2 border">In Stock</th>
              <th className="p-2 border">Stock Alert</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Air Mineral", category: "OTHERS", pricing: "Sales Type", inStock: -468, stockAlert: "1 Out" },
              { name: "All Variant Cocorich", category: "Uncategorized", pricing: "Rp. 30.000", inStock: "", stockAlert: "" },
              { name: "All Variant Coffee", category: "Uncategorized", pricing: "Rp. 25.000", inStock: "", stockAlert: "" },
              { name: "Americano", category: "CLASSIC COFFEE", pricing: "Sales Type", inStock: "", stockAlert: "" },
              { name: "Avocado Cocorich", category: "COCORICH", pricing: "Rp. 27.000", inStock: "", stockAlert: "" },
            ].map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.category}</td>
                <td className="p-2 border">{item.pricing}</td>
                <td className="p-2 border text-center">{item.inStock}</td>
                <td className={`p-2 border text-center ${item.stockAlert === "1 Out" ? "text-red-500" : ""}`}>
                  {item.stockAlert}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemLibraryPage;
