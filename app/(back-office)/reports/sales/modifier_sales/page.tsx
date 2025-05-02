"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data modifier sales
interface ModifierSalesData {
  modifierName: string;
  quantity: number;
  totalSales: number;
  hpp: number;
  grossSales: number;
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

const ModifierSales = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<ModifierSalesData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<
    "modifierName" | "quantity" | "totalSales" | "hpp" | "grossSales" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/modifierSales?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/modifierSales?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const result: ModifierSalesData[] = await res.json();
      setData(result);
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

  const formatCurrency = (num: number): string => "Rp " + num.toLocaleString("id-ID");

  const totalQuantity = data.reduce((acc, item) => acc + item.quantity, 0);
  const totalSales = data.reduce((acc, item) => acc + item.totalSales, 0);
  const totalHPP = data.reduce((acc, item) => acc + item.hpp, 0);
  const totalGrossSales = data.reduce((acc, item) => acc + item.grossSales, 0);

  const handleSort = (
    column: "modifierName" | "quantity" | "totalSales" | "hpp" | "grossSales"
  ) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const direction = sortDirection === "asc" ? 1 : -1;
    switch (sortColumn) {
      case "modifierName":
        return direction * a.modifierName.localeCompare(b.modifierName);
      case "quantity":
        return direction * (a.quantity - b.quantity);
      case "totalSales":
        return direction * (a.totalSales - b.totalSales);
      case "hpp":
        return direction * (a.hpp - b.hpp);
      case "grossSales":
        return direction * (a.grossSales - b.grossSales);
      default:
        return 0;
    }
  });

  const exportData = [
    ...sortedData.map((item) => ({
      "Nama Modifier": item.modifierName,
      "Quantity Sold": item.quantity,
      "Total Sales": formatCurrency(item.totalSales),
      HPP: formatCurrency(item.hpp),
      "Gross Sales": formatCurrency(item.grossSales),
    })),
    {
      "Nama Modifier": "Total",
      "Quantity Sold": totalQuantity,
      "Total Sales": formatCurrency(totalSales),
      HPP: formatCurrency(totalHPP),
      "Gross Sales": formatCurrency(totalGrossSales),
    },
  ];

  const exportColumns = [
    { header: "Nama Modifier", key: "Nama Modifier" },
    { header: "Quantity Sold", key: "Quantity Sold" },
    { header: "Total Sales", key: "Total Sales" },
    { header: "HPP", key: "HPP" },
    { header: "Gross Profit", key: "Gross Sales" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Modifier Sales</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Modifier-sales-${selectedPeriod}-${startDate}`}
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
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
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
                  <div className="flex items-center">
                    Nama Modifier
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("modifierName")}
                        className={`text-gray-500 ${sortColumn === "modifierName" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("modifierName")}
                        className={`text-gray-500 ${sortColumn === "modifierName" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Quantity Sold
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("quantity")}
                        className={`text-gray-500 ${sortColumn === "quantity" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("quantity")}
                        className={`text-gray-500 ${sortColumn === "quantity" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Total Sales
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("totalSales")}
                        className={`text-gray-500 ${sortColumn === "totalSales" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("totalSales")}
                        className={`text-gray-500 ${sortColumn === "totalSales" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    HPP
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("hpp")}
                        className={`text-gray-500 ${sortColumn === "hpp" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("hpp")}
                        className={`text-gray-500 ${sortColumn === "hpp" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Gross Profit
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("grossSales")}
                        className={`text-gray-500 ${sortColumn === "grossSales" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("grossSales")}
                        className={`text-gray-500 ${sortColumn === "grossSales" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.modifierName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.totalSales)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.hpp)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.grossSales)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalQuantity}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalSales)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalHPP)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGrossSales)}</td>
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

export default function ModifierSalesPage() {
  return (
      <ModifierSales />
  );
}