"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data payment method
interface PaymentMethodData {
  paymentMethod: string;
  count: number;
  totalRevenue: number;
}

const getPreviousDate = (dateStr: string, period: string): string => {
  const date = new Date(dateStr);
  switch (period) {
    case "daily":
      date.setDate(date.getDate() - 1);
      break;
    case "weekly":
      date.setDate(date.getDate() - 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() - 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      break;
  }
  return date.toISOString().split("T")[0];
};

const PaymentMethods = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/paymentMethodStats?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/paymentMethodStats?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const result: PaymentMethodData[] = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num: number): string =>
    "Rp " + num.toLocaleString("id-ID");

  // Hitung total
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);
  const totalRevenue = data.reduce((acc, item) => acc + item.totalRevenue, 0);

  // Data untuk ekspor
  const exportData = [
    ...data.map((item) => ({
      "Payment Method": item.paymentMethod,
      "Number of Transaction": item.count,
      "Total Collected": formatCurrency(item.totalRevenue),
    })),
    {
      "Payment Method": "Total",
      "Number of Transaction": totalCount,
      "Total Collected": formatCurrency(totalRevenue),
    },
  ];

  const exportColumns = [
    { header: "Payment Method", key: "Payment Method" },
    { header: "Number of Transaction", key: "Number of Transaction" },
    { header: "Total Collected", key: "Total Collected" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`payment-methods-${selectedPeriod}-${startDate}`}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setSelectedPeriod(e.target.value)
            }
            className="p-2 border rounded bg-white text-[#212121] shadow-sm"
          >
            <option value="daily">Hari Ini</option>
            <option value="daily-prev">Hari Sebelumnya</option>
            <option value="weekly">Minggu Ini</option>
            <option value="weekly-prev">Minggu Lalu</option>
            <option value="monthly">Bulan Ini</option>
            <option value="monthly-prev">Bulan Lalu</option>
            <option value="yearly">Tahun Ini</option>
            <option value="yearly-prev">Tahun Lalu</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="startDate" className="text-[#212121] font-medium">
            Tanggal:
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            className="p-2 border rounded bg-white text-[#212121] shadow-sm"
          />
        </div>
        {selectedPeriod === "custom" && (
          <div className="flex gap-2 items-center">
            <label htmlFor="endDate" className="text-[#212121] font-medium">
              Sampai:
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="p-2 border rounded bg-white text-[#212121] shadow-sm"
            />
          </div>
        )}
        <button
          onClick={fetchData}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow"
        >
          {loading ? "Loading..." : "Cari"}
        </button>
      </div>

      {data.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Number of Transaction
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Total Collected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.paymentMethod}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {item.count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {formatCurrency(item.totalRevenue)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {totalCount}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {formatCurrency(totalRevenue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function PaymentMethodsPage() {
  return (
      <PaymentMethods />
  );
}