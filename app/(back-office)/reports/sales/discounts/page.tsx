"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data discount report
interface DiscountReportData {
  name: string;
  discount: string;
  count: number;
  grossDiscount: number;
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

const DiscountReport = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<DiscountReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/discountReport?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/discountReport?period=${periodQuery}&date=${queryDate}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data discount report");
      const result: DiscountReportData[] = await res.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching discount report:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num: number): string => "Rp " + num.toLocaleString("id-ID");

  const totalCount = data.reduce((acc, item) => acc + item.count, 0);
  const totalGrossDiscount = data.reduce((acc, item) => acc + item.grossDiscount, 0);

  const exportData = [
    ...data.map((item) => ({
      Name: item.name,
      Discount: item.discount,
      Count: item.count,
      "Gross Discount": formatCurrency(item.grossDiscount),
    })),
    {
      Name: "Total",
      Discount: "",
      Count: totalCount,
      "Gross Discount": formatCurrency(totalGrossDiscount),
    },
  ];

  const exportColumns = [
    { header: "Name", key: "Name" },
    { header: "Discount", key: "Discount" },
    { header: "Count", key: "Count" },
    { header: "Total Discount", key: "Gross Discount" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Discount Report</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Discount-report-${selectedPeriod}-${startDate}`}
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

      {loading ? (
        <p className="text-center text-gray-600">Memuat data...</p>
      ) : data.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Discount</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Count</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total Discount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.discount}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.grossDiscount)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900"></td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{totalCount}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalGrossDiscount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data diskon untuk periode ini.</p>
      )}
    </div>
  );
};

export default function DiscountReportPage() {
  return (
      <DiscountReport />
  );
}