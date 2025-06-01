"use client";
import { useState, useEffect, ChangeEvent, useCallback, Fragment } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data modifier sales
interface ModifierSalesData {
  modifierId: number;
  modifierName: string;
  categoryName: string; 
  quantity: number;
  totalSales: number;
  totalHpp: number; 
  grossProfit: number; 
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
    "modifierName" | "categoryName" | "quantity" | "totalSales" | "totalHpp" | "grossProfit" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      const endpoint = "/api/modifierSales"; 
      if (selectedPeriod === "custom") {
        url = `${endpoint}?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `${endpoint}?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data dari API");
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

  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "Rp 0";
    return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  const totalQuantity = data.reduce((acc, item) => acc + item.quantity, 0);
  const totalSalesSum = data.reduce((acc, item) => acc + item.totalSales, 0);
  const totalHppSum = data.reduce((acc, item) => acc + item.totalHpp, 0);
  const totalGrossProfitSum = data.reduce((acc, item) => acc + item.grossProfit, 0);

  const handleSort = (
    column: "modifierName" | "categoryName" | "quantity" | "totalSales" | "totalHpp" | "grossProfit"
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
      case "categoryName":
        return direction * a.categoryName.localeCompare(b.categoryName);
      case "quantity":
        return direction * (a.quantity - b.quantity);
      case "totalSales":
        return direction * (a.totalSales - b.totalSales);
      case "totalHpp":
        return direction * (a.totalHpp - b.totalHpp);
      case "grossProfit":
        return direction * (a.grossProfit - b.grossProfit);
      default:
        return 0;
    }
  });

  const exportData = sortedData.map((item) => ({
    "Nama Modifier": item.modifierName,
    "Kategori": item.categoryName,
    "Kuantitas Terjual": item.quantity,
    "Total Penjualan": formatCurrency(item.totalSales),
    "Total HPP": formatCurrency(item.totalHpp),
    "Laba Kotor": formatCurrency(item.grossProfit),
  }));
  
  exportData.push({
    "Nama Modifier": "TOTAL KESELURUHAN",
    "Kategori": "",
    "Kuantitas Terjual": totalQuantity,
    "Total Penjualan": formatCurrency(totalSalesSum),
    "Total HPP": formatCurrency(totalHppSum),
    "Laba Kotor": formatCurrency(totalGrossProfitSum),
  });

  const exportColumns = [
    { header: "Nama Modifier", key: "Nama Modifier" },
    { header: "Kategori", key: "Kategori" },
    { header: "Kuantitas Terjual", key: "Kuantitas Terjual" },
    { header: "Total Penjualan", key: "Total Penjualan" },
    { header: "Total HPP", key: "Total HPP" },
    { header: "Laba Kotor", key: "Laba Kotor" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laporan Penjualan Modifier</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Laporan-Penjualan-Modifier-${selectedPeriod}-${startDate}${selectedPeriod === 'custom' && endDate ? '-'+endDate : ''}`}
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
            {selectedPeriod === "custom" ? "Tanggal Mulai:" : "Tanggal:"}
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
              min={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="p-2 border rounded bg-white text-[#212121] shadow-sm"
            />
          </div>
        )}
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow"
        >
          {loading ? "Loading..." : "Cari"}
        </button>
      </div>

      {loading && (
          <div className="text-center py-10 text-gray-500">Memuat data...</div>
      )}
      {!loading && data.length === 0 && (
        <p className="text-center text-gray-600 py-10">Tidak ada data penjualan modifier untuk periode yang dipilih.</p>
      )}
      {!loading && data.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-x-auto"> 
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center">
                    Nama Modifier
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("modifierName")} className={`text-xs leading-none p-0.5 ${sortColumn === "modifierName" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("modifierName")} className={`text-xs leading-none p-0.5 ${sortColumn === "modifierName" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center">
                    Kategori
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("categoryName")} className={`text-xs leading-none p-0.5 ${sortColumn === "categoryName" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("categoryName")} className={`text-xs leading-none p-0.5 ${sortColumn === "categoryName" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Kuantitas
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("quantity")} className={`text-xs leading-none p-0.5 ${sortColumn === "quantity" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("quantity")} className={`text-xs leading-none p-0.5 ${sortColumn === "quantity" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Total Penjualan
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("totalSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "totalSales" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("totalSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "totalSales" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Total HPP
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("totalHpp")} className={`text-xs leading-none p-0.5 ${sortColumn === "totalHpp" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("totalHpp")} className={`text-xs leading-none p-0.5 ${sortColumn === "totalHpp" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Laba Kotor
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("grossProfit")} className={`text-xs leading-none p-0.5 ${sortColumn === "grossProfit" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("grossProfit")} className={`text-xs leading-none p-0.5 ${sortColumn === "grossProfit" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item) => (
                <tr key={item.modifierId} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.modifierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoryName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.totalSales)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.totalHpp)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.grossProfit)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900"></td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalQuantity}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalSalesSum)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalHppSum)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGrossProfitSum)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function ModifierSalesPage() {
  return (
      <ModifierSales />
  );
}
