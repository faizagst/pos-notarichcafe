"use client";
import { useEffect, useState } from "react";

interface CompletedOrder {
  id: number;
  tableNumber: string;
  total: number;
  discountAmount: number; 
  taxAmount: number;    
  gratuityAmount: number; 
  roundingAmount: number;
  finalTotal: number;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: {
    id: number;
    menuName: string;
    quantity: number;
    note?: string;
    modifiers?: {     
      id: number;
      modifierId: number;
      name: string;
      price: number;
    }[];
  }[];
}

export default function HistoryPage() {
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk filter
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");

  useEffect(() => {
    fetchCompletedOrders();
  }, [startDate, endDate]);

  const fetchCompletedOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(tableNumber && { tableNumber }),
        ...(paymentMethod && { paymentMethod }),
        ...(minTotal && { minTotal }),
        ...(maxTotal && { maxTotal }),
      }).toString();

      const response = await fetch(`/api/completedOrders?${queryParams}`);
      if (!response.ok) throw new Error("Gagal mengambil data riwayat pesanan");

      const data = await response.json();
      setCompletedOrders(
        data.orders.map((order: any) => ({
          ...order,
          orderItems: order.orderItems.map((item: any) => ({
            id: item.id,
            menuName: item.menuName,
            quantity: item.quantity,
            note: item.note,
            modifiers: item.modifiers || [],
          })),
        }))
      );
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Gagal memuat data riwayat. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompletedOrders();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4]">
      {/* Konten Utama */}
      <div className={`flex-1 p-6`}>
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">
          📜 Riwayat Pesanan
        </h1>

        {/* Form Filter */}
        <form onSubmit={handleFilterSubmit} className="mb-6 p-6 bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#979797]">Tanggal Awal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#979797]">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#979797]">Nomor Meja</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#979797]">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              >
                <option value="">Semua</option>
                <option value="tunai">Tunai</option>
                <option value="kartu">Kartu</option>
                <option value="e-wallet">E-Wallet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#979797]">Total Minimal</label>
              <input
                type="number"
                value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#979797]">Total Maksimal</label>
              <input
                type="number"
                value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                className="w-full p-2 border border-[#92700C] rounded-md"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 w-full bg-[#FF8A00] hover:bg-[#92700C] text-white py-2 rounded-md"
          >
            Terapkan Filter
          </button>
        </form>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {loading ? (
          <p className="text-center text-[#979797]">Memuat data riwayat pesanan...</p>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {completedOrders.length === 0 ? (
              <p className="text-center text-[#979797]">Tidak ada riwayat pesanan.</p>
            ) : (
              completedOrders.map((order) => (
                <div key={order.id} className="bg-white shadow-md rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-[#979797]">Nomor Meja</p>
                      <p className="font-semibold text-[#0E0E0E]">{order.tableNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Subtotal</p>
                      <p className="font-semibold text-[#0E0E0E]">Rp {order.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Metode Pembayaran</p>
                      <p className="font-semibold text-[#0E0E0E]">{order.paymentMethod || "Tunai"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Tanggal</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Diskon</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        Rp {order.discountAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Pajak (10%)</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        Rp {order.taxAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Gratuity (2%)</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        Rp {order.gratuityAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Rounding</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        Rp {order.roundingAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#979797]">Total Akhir</p>
                      <p className="font-semibold text-[#0E0E0E]">
                        Rp {order.finalTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-[#979797]">Pesanan</p>
                    <ul className="space-y-2">
                      {order.orderItems.map((item) => (
                        <li key={item.id} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#0E0E0E]">
                              {item.menuName} - {item.quantity} pcs
                            </span>
                            {item.note && (
                              <span className="text-sm text-[#979797]">({item.note})</span>
                            )}
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <ul className="ml-4 space-y-1">
                              {item.modifiers.map((mod) => (
                                <li key={mod.id} className="text-sm text-[#0E0E0E]">
                                  + {mod.name} (Rp {mod.price.toLocaleString()})
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}