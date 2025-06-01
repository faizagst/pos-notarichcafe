"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data category sales
interface CategorySalesData {
  category: string;
  itemSold: number;
  grossSales: number;
  discount: number;
  netSales: number; 
  cogs: number;
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

const CategorySales = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<CategorySalesData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<
    "category" | "itemSold" | "grossSales" | "discount" | "netSales" | "cogs" | "grossProfit" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      const endpoint = "/api/categorySales"; 

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
      const result: CategorySalesData[] = await res.json();
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

  // Kalkulasi total berdasarkan field baru
  const totalItemSold = data.reduce((acc, item) => acc + item.itemSold, 0);
  const totalGrossSales = data.reduce((acc, item) => acc + item.grossSales, 0);
  const totalDiscount = data.reduce((acc, item) => acc + item.discount, 0);
  const totalNetSales = data.reduce((acc, item) => acc + item.netSales, 0);
  const totalCogs = data.reduce((acc, item) => acc + item.cogs, 0);
  const totalGrossProfit = data.reduce((acc, item) => acc + item.grossProfit, 0);


  const handleSort = (
    column: "category" | "itemSold" | "grossSales" | "discount" | "netSales" | "cogs" | "grossProfit"
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
      case "category":
        return direction * a.category.localeCompare(b.category);
      case "itemSold":
        return direction * (a.itemSold - b.itemSold);
      case "grossSales":
        return direction * (a.grossSales - b.grossSales);
      case "discount":
        return direction * (a.discount - b.discount);
      case "netSales":
        return direction * (a.netSales - b.netSales);
      case "cogs":
        return direction * (a.cogs - b.cogs);
      case "grossProfit":
        return direction * (a.grossProfit - b.grossProfit);
      default:
        return 0;
    }
  });

  const exportData = sortedData.map((item) => ({
    "Kategori": item.category,
    "Item Terjual": item.itemSold,
    "Gross Sales": formatCurrency(item.grossSales),
    "Diskon": formatCurrency(item.discount),
    "Net Sales": formatCurrency(item.netSales),
    "COGS/HPP": formatCurrency(item.cogs),
    "Laba Kotor": formatCurrency(item.grossProfit),
  }));
  
  exportData.push({
    "Kategori": "TOTAL KESELURUHAN",
    "Item Terjual": totalItemSold,
    "Gross Sales": formatCurrency(totalGrossSales),
    "Diskon": formatCurrency(totalDiscount),
    "Net Sales": formatCurrency(totalNetSales),
    "COGS/HPP": formatCurrency(totalCogs),
    "Laba Kotor": formatCurrency(totalGrossProfit),
  });

  const exportColumns = [
    { header: "Kategori", key: "Kategori" },
    { header: "Item Terjual", key: "Item Terjual" },
    { header: "Gross Sales", key: "Gross Sales" },
    { header: "Diskon", key: "Diskon" },
    { header: "Net Sales", key: "Net Sales" },
    { header: "COGS/HPP", key: "COGS/HPP" },
    { header: "Laba Kotor", key: "Laba Kotor" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Laporan Penjualan per Kategori</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Laporan-Kategori-${selectedPeriod}-${startDate}${selectedPeriod === 'custom' && endDate ? '-'+endDate : ''}`}
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
        <p className="text-center text-gray-600 py-10">Tidak ada data penjualan untuk periode yang dipilih.</p>
      )}
      {!loading && data.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg overflow-x-auto"> 
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center">
                    Kategori
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("category")} className={`text-xs leading-none p-0.5 ${sortColumn === "category" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("category")} className={`text-xs leading-none p-0.5 ${sortColumn === "category" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Item Terjual
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("itemSold")} className={`text-xs leading-none p-0.5 ${sortColumn === "itemSold" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("itemSold")} className={`text-xs leading-none p-0.5 ${sortColumn === "itemSold" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Gross Sales
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("grossSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "grossSales" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("grossSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "grossSales" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Diskon
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("discount")} className={`text-xs leading-none p-0.5 ${sortColumn === "discount" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("discount")} className={`text-xs leading-none p-0.5 ${sortColumn === "discount" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Net Sales
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("netSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "netSales" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("netSales")} className={`text-xs leading-none p-0.5 ${sortColumn === "netSales" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    COGS/HPP
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("cogs")} className={`text-xs leading-none p-0.5 ${sortColumn === "cogs" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("cogs")} className={`text-xs leading-none p-0.5 ${sortColumn === "cogs" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
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
              {sortedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.itemSold}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.grossSales)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.discount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.netSales)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.cogs)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.grossProfit)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalItemSold}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGrossSales)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalDiscount)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalNetSales)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalCogs)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGrossProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function CategorySalesPage() {
  return (
      <CategorySales />
  );
}
