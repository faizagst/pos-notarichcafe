"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data category sales
interface CategorySalesData {
  category: string;
  itemSold: number;
  totalCollected: number;
  discount: number;
  tax: number;
  gratuity: number;
  netSales: number;
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
    "category" | "itemSold" | "totalCollected" | "discount" | "tax" | "gratuity" | "netSales" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/categorySales?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/categorySales?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data");
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

  const formatCurrency = (num: number): string => "Rp " + num.toLocaleString("id-ID");

  const totalItemSold = data.reduce((acc, item) => acc + item.itemSold, 0);
  const totalCollected = data.reduce((acc, item) => acc + item.totalCollected, 0);
  const totalDiscount = data.reduce((acc, item) => acc + item.discount, 0);
  const totalTax = data.reduce((acc, item) => acc + item.tax, 0);
  const totalGratuity = data.reduce((acc, item) => acc + item.gratuity, 0);
  const totalNetSales = data.reduce((acc, item) => acc + item.netSales, 0);

  const handleSort = (
    column: "category" | "itemSold" | "totalCollected" | "discount" | "tax" | "gratuity" | "netSales"
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
      case "totalCollected":
        return direction * (a.totalCollected - b.totalCollected);
      case "discount":
        return direction * (a.discount - b.discount);
      case "tax":
        return direction * (a.tax - b.tax);
      case "gratuity":
        return direction * (a.gratuity - b.gratuity);
      case "netSales":
        return direction * (a.netSales - b.netSales);
      default:
        return 0;
    }
  });

  const exportData = [
    ...sortedData.map((item) => ({
      Category: item.category,
      "Item Sold": item.itemSold,
      "Total Collected": formatCurrency(item.totalCollected),
      Discount: formatCurrency(item.discount),
      Tax: formatCurrency(item.tax),
      Gratuity: formatCurrency(item.gratuity),
      "Net Sales": formatCurrency(item.netSales),
    })),
    {
      Category: "Total",
      "Item Sold": totalItemSold,
      "Total Collected": formatCurrency(totalCollected),
      Discount: formatCurrency(totalDiscount),
      Tax: formatCurrency(totalTax),
      Gratuity: formatCurrency(totalGratuity),
      "Net Sales": formatCurrency(totalNetSales),
    },
  ];

  const exportColumns = [
    { header: "Category", key: "Category" },
    { header: "Item Sold", key: "Item Sold" },
    { header: "Total Collected", key: "Total Collected" },
    { header: "Discount", key: "Discount" },
    { header: "Tax", key: "Tax" },
    { header: "Gratuity", key: "Gratuity" },
    { header: "Net Sales", key: "Net Sales" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Category Sales</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Category-sales-${selectedPeriod}-${startDate}`}
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
                    Category
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("category")}
                        className={`text-gray-500 ${sortColumn === "category" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("category")}
                        className={`text-gray-500 ${sortColumn === "category" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Item Sold
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("itemSold")}
                        className={`text-gray-500 ${sortColumn === "itemSold" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("itemSold")}
                        className={`text-gray-500 ${sortColumn === "itemSold" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Total Collected
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("totalCollected")}
                        className={`text-gray-500 ${sortColumn === "totalCollected" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("totalCollected")}
                        className={`text-gray-500 ${sortColumn === "totalCollected" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Discount
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("discount")}
                        className={`text-gray-500 ${sortColumn === "discount" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("discount")}
                        className={`text-gray-500 ${sortColumn === "discount" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Tax
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("tax")}
                        className={`text-gray-500 ${sortColumn === "tax" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("tax")}
                        className={`text-gray-500 ${sortColumn === "tax" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Gratuity
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("gratuity")}
                        className={`text-gray-500 ${sortColumn === "gratuity" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("gratuity")}
                        className={`text-gray-500 ${sortColumn === "gratuity" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end">
                    Net Sales
                    <div className="ml-2 flex flex-col">
                      <button
                        onClick={() => handleSort("netSales")}
                        className={`text-gray-500 ${sortColumn === "netSales" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleSort("netSales")}
                        className={`text-gray-500 ${sortColumn === "netSales" && sortDirection === "desc" ? "text-blue-500" : ""}`}
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
                  <td className="px-6 py-4 text-sm text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.itemSold}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.totalCollected)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.discount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.tax)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.gratuity)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.netSales)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalItemSold}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalCollected)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalDiscount)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalTax)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGratuity)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalNetSales)}</td>
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

export default function CategorySalesPage() {
  return (
      <CategorySales />
  );
}