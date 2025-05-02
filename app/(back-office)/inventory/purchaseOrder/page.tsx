'use client'
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";


type Ingredient = {
  id: number;
  name: string;
  unit: string;
};

type PurchaseOrder = {
  id: number;
  ingredient: Ingredient;
  quantity: number;
  totalPrice: number;
  createdAt: string;
};

const PurchaseOrderForm: React.FC = () => {
  const [rawIngredients, setRawIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ingredientId: 0,
    quantity: 0,
    totalPrice: 0,
  });
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  // Fetch data ingredient dengan tipe "raw"
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch("/api/ingredients");
        if (!response.ok) throw new Error("Gagal mengambil data");
        
        const data = await response.json();
        const rawData = data.filter((item: any) => item.type === "RAW");
        setRawIngredients(rawData);
      } catch (err) {
        setError("Gagal memuat data ingredient");
      } finally {
        setLoading(false);
      }
    };
    
    fetchIngredients();
  }, []);
  
  const handleIngredientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ingredientId = parseInt(e.target.value, 10);
    const ingredient = rawIngredients.find((ing) => ing.id === ingredientId) || null;
    setSelectedIngredient(ingredient);
    setForm((prev) => ({
      ...prev,
      ingredientId,
    }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };
  
  const conversionPricePerUnit = form.quantity > 0 ? form.totalPrice / form.quantity : 0;
  
  // Submit form untuk membuat purchase order baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      const response = await fetch("/api/purchaseOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
  
      if (!response.ok) throw new Error("Gagal mengirim data");
  
      toast.success("Purchase order berhasil dibuat!");
      setForm({ ingredientId: 0, quantity: 0, totalPrice: 0 });
      setSelectedIngredient(null);
    } catch (err) {
      toast.error("Terjadi kesalahan saat membuat purchase order");
    }
  };
  
  // Fungsi untuk mengubah tanggal pada input date
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
  // Fungsi untuk fetch purchase order berdasarkan tanggal yang dipilih
  const handleFetchOrders = async () => {
    try {
      const response = await fetch("/api/purchaseOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({date: selectedDate }),
      });
      if (!response.ok) throw new Error("Gagal mengambil data purchase order");
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (err) {
      toast.error("Tanggal hari harus di isi terlebih dahulu")
    }
  };

  
  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Purchase Order</h1>
      {/* Form Create Purchase Order */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Create Purchase Order</h2>
  
        {loading && <p className="text-gray-500">Loading ingredients...</p>}
        {error && <p className="text-red-500">{error}</p>}
  
        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilih Ingredient */}
            <div>
              <label className="block text-gray-600">Ingredient:</label>
              <select
                value={form.ingredientId || ""}
                onChange={handleIngredientChange}
                required
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Pilih Ingredient</option>
                {rawIngredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Tampilkan Unit */}
            {selectedIngredient && (
              <div className="text-gray-700 font-medium">
                <p>
                  Unit: <span className="text-blue-500">{selectedIngredient.unit}</span>
                </p>
              </div>
            )}
  
            {/* Input Quantity */}
            <div>
              <label className="block text-gray-600">Buy Quantity:</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleInputChange}
                required
                min={1}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
  
            {/* Input Total Price */}
            <div>
              <label className="block text-gray-600">Total Price:</label>
              <input
                type="number"
                name="totalPrice"
                value={form.totalPrice}
                onChange={handleInputChange}
                required
                min={1}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
  
            {/* Conversion Price Per Unit */}
            <div className="text-gray-700 font-medium">
              <p>
                Conversion Price Per {selectedIngredient ? selectedIngredient.unit : "Unit"}:{" "}
                <span className="text-green-500">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(conversionPricePerUnit)}
                </span>
              </p>
            </div>


  
            {/* Tombol Submit */}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Submit
            </button>
          </form>
        )}
      </div>
  
      {/* Bagian Fetch Purchase Order Berdasarkan Tanggal */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Fetch Purchase Orders by Date</h3>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleFetchOrders}
            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition duration-300"
          >
            Fetch Orders
          </button>
        </div>
  
        {purchaseOrders.length > 0 && (
          <table className="min-w-full mt-4 border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Ingredient</th>
                <th className="border border-gray-300 p-2">Quantity</th>
                <th className="border border-gray-300 p-2">Total Price</th>
                <th className="border border-gray-300 p-2">Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((order) => (
                <tr key={order.id}>
                  <td className="border border-gray-300 p-2">{order.ingredient.name}</td>
                  <td className="border border-gray-300 p-2">{order.quantity} {order.ingredient.unit}</td>
                  <td className="border border-gray-300 p-2">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(order.totalPrice)}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
