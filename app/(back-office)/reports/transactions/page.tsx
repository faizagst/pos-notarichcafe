"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data transaksi
interface TransactionItem {
  menuName: string;
  total: number;
  quantity: number;
  modifiers: {
    name: string;
    price: number;
  }[];
}


interface TransactionDetail {
  time: string; // ISO string dari Date
  items: TransactionItem[];
  totalPrice: number;
}

interface TransactionSummary {
  totalTransactions: number;
  totalCollected: number;
  netSales: number;
}

interface TransactionData {
  summary: TransactionSummary;
  details: TransactionDetail[];
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

const Transactions = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<"time" | "totalPrice" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/transactions?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/transactions?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data transaksi");
      const result: TransactionData = await res.json();
      setData(result);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num: number): string => "Rp " + num.toLocaleString("id-ID");

  const totalTransactions = data?.summary.totalTransactions || 0;
  const totalCollected = data?.summary.totalCollected || 0;
  const netSales = data?.summary.netSales || 0;

  const handleSort = (column: "time" | "totalPrice") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedDetails = data?.details
    ? [...data.details].sort((a, b) => {
      if (!sortColumn) return 0;
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "time") {
        return direction * (new Date(a.time).getTime() - new Date(b.time).getTime());
      } else if (sortColumn === "totalPrice") {
        return direction * (a.totalPrice - b.totalPrice);
      }
      return 0;
    })
    : [];

  const exportData = [
    ...sortedDetails.map((item) => ({
      Time: new Date(item.time).toLocaleString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      Items: item.items.map((i) => `${i.menuName} (Rp ${i.total.toLocaleString("id-ID")})`).join(", "),
      "Total Price": formatCurrency(item.totalPrice),
    })),
    {
      Time: "Total",
      Items: "",
      "Total Price": formatCurrency(totalCollected),
    },
  ];

  const exportColumns = [
    { header: "Time", key: "Time" },
    { header: "Items", key: "Items" },
    { header: "Total Price", key: "Total Price" },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <div
        className={'flex-1 p-6'}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-[#212121]">Transactions</h1>
            <ExportButton
              data={exportData}
              columns={exportColumns}
              fileName={`Transactions-${selectedPeriod}-${startDate}`}
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
                  className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
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

          {data ? (
            <div>
              <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-[#212121]">{totalTransactions}</p>
                    <p className="text-sm text-gray-600">Transactions</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#212121]">{formatCurrency(totalCollected)}</p>
                    <p className="text-sm text-gray-600">Total Collected</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#212121]">{formatCurrency(netSales)}</p>
                    <p className="text-sm text-gray-600">Net Sales</p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        <div className="flex items-center">
                          Time
                          <div className="ml-2 flex flex-col">
                            <button
                              onClick={() => handleSort("time")}
                              className={`text-gray-500 ${sortColumn === "time" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleSort("time")}
                              className={`text-gray-500 ${sortColumn === "time" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(startDate).toLocaleString("id-ID", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        <div className="flex items-center justify-end">
                          Total Price
                          <div className="ml-2 flex flex-col">
                            <button
                              onClick={() => handleSort("totalPrice")}
                              className={`text-gray-500 ${sortColumn === "totalPrice" && sortDirection === "asc" ? "text-blue-500" : ""}`}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleSort("totalPrice")}
                              className={`text-gray-500 ${sortColumn === "totalPrice" && sortDirection === "desc" ? "text-blue-500" : ""}`}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">{formatCurrency(totalCollected)}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedDetails.map((transaction, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(transaction.time).toLocaleString("id-ID", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.items.map((item, i) => (
                            <div key={i} className="mb-2">
                              <div>{item.menuName} × {item.quantity}</div>

                              {item.modifiers.length > 0 && (
                                <ul className="ml-4 list-disc text-gray-500 text-xs">
                                  {item.modifiers.map((mod, j) => (
                                    <li key={j}>
                                      {mod.name} ({formatCurrency(mod.price)})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {formatCurrency(transaction.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-600">Tidak ada data.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;