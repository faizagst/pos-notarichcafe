"use client";

import { useState, useEffect } from "react";

interface Ingredient {
  id: number;
  name: string;
  stock: number;
  stockMin: number;
  unit: string;
}

export default function MinimumStock() {
  // Default threshold diatur ke 20
  const [operator, setOperator] = useState<"lt" | "gt">("lt");
  const [threshold, setThreshold] = useState<number>(20);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fetchMinimumStock = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/minimumStock?operator=${operator}&threshold=${threshold}`
      );
      if (!res.ok) {
        throw new Error("Error fetching minimum stock data");
      }
      const data = await res.json();
      setIngredients(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data otomatis saat komponen dimount
  useEffect(() => {
    fetchMinimumStock();
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow mt-6 w-full">
      <h2 className="text-xl font-bold mb-4">Stok Minimum</h2>
      <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="font-medium">Filter stok:</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as "lt" | "gt")}
            className="p-2 border rounded"
          >
            <option value="lt">Kurang dari</option>
            <option value="gt">Lebih dari</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="p-2 border rounded w-24"
            placeholder="Angka"
          />
          <button
            onClick={fetchMinimumStock}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Cari
          </button>
        </div>
      </div>
      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {ingredients.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Nama Stok</th>
                <th className="border p-2 text-left">Sisa Stok</th>
                <th className="border p-2 text-left">Minimum Stok</th>
                <th className="border p-2 text-left">Unit</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="hover:bg-gray-50">
                  <td className="border p-2">{ing.name}</td>
                  <td className="border p-2">{ing.stock}</td>
                  <td className="border p-2">{ing.stockMin}</td>
                  <td className="border p-2">{ing.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && <p className="text-gray-500">Tidak ada data.</p>
      )}
    </div>
  );
}
