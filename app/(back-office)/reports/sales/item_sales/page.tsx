"use client";
import { useState, useEffect, ChangeEvent, useCallback, Fragment } from "react";
import { ExportButton } from "@/components/ExportButton"; // Assuming this component exists

// Interface untuk detail modifier yang terjual
interface ModifierSaleDetail {
  modifierId: number;
  modifierName: string;
  quantitySoldWithParentMenu: number;
  netSalesFromThisModifier: number;
  hppFromThisModifier: number;
  discountAllocatedToThisModifier: number;
}

// Interface untuk data item sales utama
interface ItemSalesData {
  menuId: number;
  menuName: string;
  category: string;
  quantity: number; // Kuantitas menu utama
  netSales: number; // net sales gabungan (menu + modifier)
  hpp: number; // HPP gabungan (menu + modifier)
  discount: number; // Diskon gabungan (menu + modifier)
  modifiersBreakdown?: ModifierSaleDetail[];
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

const ItemSales = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<ItemSalesData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<
    "menuName" | "category" | "quantity" | "netSales" | "hpp" | "discount" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      // Endpoint API tetap /api/item-sales
      if (selectedPeriod === "custom") {
        url = `/api/itemSales?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/itemSales?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data dari API");
      const result: ItemSalesData[] = await res.json();
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

  const totalSold = data.reduce((acc, item) => acc + item.quantity, 0);
  const totalNetSales = data.reduce((acc, item) => acc + item.netSales, 0);
  const totalHPP = data.reduce((acc, item) => acc + item.hpp, 0);
  const totalDiscount = data.reduce((acc, item) => acc + item.discount, 0);

  const handleSort = (
    column: "menuName" | "category" | "quantity" | "netSales" | "hpp" | "discount"
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
      case "menuName":
        return direction * a.menuName.localeCompare(b.menuName);
      case "category":
        return direction * a.category.localeCompare(b.category);
      case "quantity":
        return direction * (a.quantity - b.quantity);
      case "netSales":
        return direction * (a.netSales - b.netSales);
      case "hpp":
        return direction * (a.hpp - b.hpp);
      case "discount":
        return direction * (a.discount - b.discount);
      default:
        return 0;
    }
  });

  const exportData = sortedData.reduce((acc: any[], item) => {
    acc.push({
      "Nama Menu/Modifier": item.menuName,
      "Kategori": item.category,
      "Kuantitas Terjual": item.quantity,
      "Net Sales": formatCurrency(item.netSales),
      "HPP": formatCurrency(item.hpp),
      "Diskon": formatCurrency(item.discount),
      "Tipe": "Menu Utama",
    });
    if (item.modifiersBreakdown && item.modifiersBreakdown.length > 0) {
      item.modifiersBreakdown.forEach(mod => {
        acc.push({
          "Nama Menu/Modifier": `  └ ${mod.modifierName}`,
          "Kategori": "",
          "Kuantitas Terjual": mod.quantitySoldWithParentMenu,
          "Net Sales": formatCurrency(mod.netSalesFromThisModifier),
          "HPP": formatCurrency(mod.hppFromThisModifier),
          "Diskon": formatCurrency(mod.discountAllocatedToThisModifier),
          "Tipe": "Modifier",
        });
      });
    }
    return acc;
  }, []);
  
  exportData.push({
      "Nama Menu/Modifier": "TOTAL KESELURUHAN",
      "Kategori": "",
      "Kuantitas Terjual": totalSold,
      "Net Sales": formatCurrency(totalNetSales),
      "HPP": formatCurrency(totalHPP),
      "Diskon": formatCurrency(totalDiscount),
      "Tipe": "",
  });

  const exportColumns = [
    { header: "Nama Menu/Modifier", key: "Nama Menu/Modifier" },
    { header: "Kategori", key: "Kategori" },
    { header: "Kuantitas Terjual", key: "Kuantitas Terjual" },
    { header: "Net Sales", key: "Net Sales" },
    { header: "HPP", key: "HPP" },
    { header: "Diskon", key: "Diskon" },
    { header: "Tipe", key: "Tipe" },
  ];


  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Item Sales</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Laporan-Penjualan-Item-${selectedPeriod}-${startDate}${selectedPeriod === 'custom' && endDate ? '-'+endDate : ''}`}
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
            className="p-2 border rounded bg-white text-[#212121] shadow-sm" // Kelas seperti kode awal
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
              className="p-2 border rounded bg-white text-[#212121] shadow-sm" // Kelas seperti kode awal
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
                    Nama Menu
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("menuName")} className={`text-xs leading-none p-0.5 ${sortColumn === "menuName" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("menuName")} className={`text-xs leading-none p-0.5 ${sortColumn === "menuName" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
                    </div>
                  </div>
                </th>
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
                    Terjual
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("quantity")} className={`text-xs leading-none p-0.5 ${sortColumn === "quantity" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("quantity")} className={`text-xs leading-none p-0.5 ${sortColumn === "quantity" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
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
                    HPP
                    <div className="ml-2 flex flex-col">
                      <button onClick={() => handleSort("hpp")} className={`text-xs leading-none p-0.5 ${sortColumn === "hpp" && sortDirection === "asc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▲</button>
                      <button onClick={() => handleSort("hpp")} className={`text-xs leading-none p-0.5 ${sortColumn === "hpp" && sortDirection === "desc" ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>▼</button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item) => (
                <Fragment key={item.menuId}>
                  <tr className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.menuName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.netSales)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.hpp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.discount)}</td>
                  </tr>
                  {item.modifiersBreakdown && item.modifiersBreakdown.length > 0 && (
                    item.modifiersBreakdown.map(mod => (
                      <tr key={`${item.menuId}-${mod.modifierId}`} className="bg-slate-50 hover:bg-slate-100 transition-colors duration-150">
                        <td className="pl-10 pr-6 py-2 whitespace-nowrap text-sm text-gray-700 italic">└ {mod.modifierName}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">Modifier</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{mod.quantitySoldWithParentMenu}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(mod.netSalesFromThisModifier)}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(mod.hppFromThisModifier)}</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(mod.discountAllocatedToThisModifier)}</td>
                      </tr>
                    ))
                  )}
                </Fragment>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900"></td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalSold}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalNetSales)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalHPP)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalDiscount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function ItemSalesPage() {
  return (
      <ItemSales />
  );
}
