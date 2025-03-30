"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react"; // Tambahkan useCallback
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data sales summary
interface SalesSummaryData {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  gratuity: number;
  tax: number;
  rounding: number;
  totalCollected: number;
  ordersCount: number;
  startDate: string;
  endDate: string;
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

const SalesSummary = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [salesSummary, setSalesSummary] = useState<SalesSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/salesSummary?startDate=${startDate}`;
        if (endDate) {
          url += `&endDate=${endDate}`;
        }
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/salesSummary?period=${periodQuery}&date=${queryDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data sales summary");
      }
      const data: SalesSummaryData = await res.json();
      setSalesSummary(data);
    } catch (error) {
      console.error(error);
      setSalesSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, startDate, endDate]); // Dependensi untuk useCallback

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]); // Hanya fetchSummary sebagai dependensi

  const formatCurrency = (num: number): string =>
    "Rp " + num.toLocaleString("id-ID");

  const exportData = salesSummary
    ? [
        {
          "Gross Sales": formatCurrency(salesSummary.grossSales),
          Discounts: formatCurrency(salesSummary.discounts),
          Refunds: formatCurrency(salesSummary.refunds),
          "Net Sales": formatCurrency(salesSummary.netSales),
          Gratuity: formatCurrency(salesSummary.gratuity),
          Tax: formatCurrency(salesSummary.tax),
          Rounding: formatCurrency(salesSummary.rounding),
          "Total Collected": formatCurrency(salesSummary.totalCollected),
        },
      ]
    : [];

  const exportColumns = [
    { header: "Gross Sales", key: "Gross Sales" },
    { header: "Discounts", key: "Discounts" },
    { header: "Refunds", key: "Refunds" },
    { header: "Net Sales", key: "Net Sales" },
    { header: "Gratuity", key: "Gratuity" },
    { header: "Tax", key: "Tax" },
    { header: "Rounding", key: "Rounding" },
    { header: "Total Collected", key: "Total Collected" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sales Summary</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`sales-summary-${selectedPeriod}-${startDate}`}
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
          onClick={fetchSummary}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow"
        >
          {loading ? "Loading..." : "Cari"}
        </button>
      </div>
      {salesSummary ? (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between mb-2">
            <span>Gross Sales</span>
            <span>{formatCurrency(salesSummary.grossSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Discounts</span>
            <span>{formatCurrency(salesSummary.discounts)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Refunds</span>
            <span>{formatCurrency(salesSummary.refunds)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold mb-2">
            <span>Net Sales</span>
            <span>{formatCurrency(salesSummary.netSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Gratuity</span>
            <span>{formatCurrency(salesSummary.gratuity)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax</span>
            <span>{formatCurrency(salesSummary.tax)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Rounding</span>
            <span>{formatCurrency(salesSummary.rounding)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold">
            <span>Total Collected</span>
            <span>{formatCurrency(salesSummary.totalCollected)}</span>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function SalesSummaryPage() {
  return (
      <SalesSummary />
  );
}