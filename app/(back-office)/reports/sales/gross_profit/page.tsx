"use client";
import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { ExportButton } from "@/components/ExportButton";

// Interface untuk data gross profit
interface GrossProfitData {
  summary: {
    explanation: string;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
  };
  details: {
    orderId: number;
    orderDate: string;
    menuName: string;
    sellingPrice: number;
    quantity: number;
    itemTotalSelling: number;
    hpp: number;
    itemTotalHPP: number;
  }[];
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

const GrossProfit = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<GrossProfitData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/grossProfit?startDate=${startDate}`;
        if (endDate) {
          url += `&endDate=${endDate}`;
        }
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/grossProfit?period=${periodQuery}&date=${queryDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data gross profit");
      }
      const result: GrossProfitData = await res.json();
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

  const formatCurrency = (num: number | undefined): string =>
    "Rp " + (num ?? 0).toLocaleString("id-ID");

  const grossSales = data?.summary?.grossSales ?? 0;
  const discounts = data?.summary?.discounts ?? 0;
  const refunds = data?.summary?.refunds ?? 0;
  const netSales = data?.summary?.netSales ?? 0;
  const cogs = data?.summary?.cogs ?? 0;
  const cogsPercentage = netSales > 0 ? ((cogs / netSales) * 100).toFixed(2) : "0.00";
  const grossProfit = data?.summary?.grossProfit ?? 0;

  const tableData = data
    ? [
        {
          "Gross Sales": formatCurrency(data.summary.grossSales),
          Discounts: formatCurrency(data.summary.discounts),
          Refunds: formatCurrency(data.summary.refunds),
          "Net Sales": formatCurrency(data.summary.netSales),
          COGS: formatCurrency(data.summary.cogs),
        },
      ]
    : [];
  const columns = [
    { header: "Gross Sales", key: "Gross Sales" },
    { header: "Discounts", key: "Discounts" },
    { header: "Refunds", key: "Refunds" },
    { header: "Net Sales", key: "Net Sales" },
    { header: "COGS", key: "COGS" },
    { header: "Gross Profit", key: "Gross Profit" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gross Profit</h1>
        <ExportButton data={tableData} columns={columns} fileName="GrossProfit_Report" />
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

      {/* Kartu Informasi COGS */}
      <div className="mb-6 p-4 bg-gradient-to-r from-white to-[#ffe4c428] rounded-lg shadow-md border-l-4 border-[#0059ff]">
        <h3 className="text-lg font-semibold text-[#212121] mb-2">Apa itu COGS?</h3>
        <p className="text-[#212121] text-sm">
          <strong>Cost of Goods Sold (COGS)</strong> adalah total biaya langsung untuk memproduksi barang yang dijual, dalam hal ini dihitung dari <strong>Harga Bakul (HPP)</strong> pada menu. COGS mencerminkan biaya bahan baku yang digunakan untuk setiap item yang terjual, memberikan gambaran efisiensi operasional dalam menghasilkan pendapatan.
        </p>
      </div>

      {data ? (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between mb-2">
            <span>Gross Sales</span>
            <span>{formatCurrency(grossSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Discounts</span>
            <span>{formatCurrency(discounts)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Refunds</span>
            <span>{formatCurrency(refunds)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold mb-2">
            <span>Net Sales</span>
            <span>
              {formatCurrency(netSales)}{" "}
              <span className="text-green-500">(100%)</span>
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Cost of Goods Sold (COGS)</span>
            <span>
              {formatCurrency(cogs)}{" "}
              <span className="text-red-500">({cogsPercentage}%)</span>
            </span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold mb-2">
            <span>Gross Profit</span>
            <span>
              {formatCurrency(grossProfit)}{" "}
              <span className="text-green-500">({100 - Number(cogsPercentage)}%)</span>
            </span>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function GrossProfitPage() {
  return (
      <GrossProfit />
  );
}