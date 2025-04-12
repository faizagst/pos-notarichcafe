"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ExportButton } from "@/components/ExportButton";

interface SalesData {
  date: string;
  salesPerTransaction: number;
}

interface SalesDetail {
  date: string;
  summary: {
    netSales: number;
    transactionCount: number;
    salesPerTransaction: number;
  };
  details: {
    menuName: string;
    sellingPrice: number;
    quantity: number;
    totalSales: number;
  }[];
}

// Helper untuk format YYYY-MM-DD (hari ini)
const getToday = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

function generateDateRange(start: string, end: string): string[] {
  const result: string[] = [];
  let current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    result.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export default function SalesTransactionChart() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [period, setPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState("");

  const [selectedDetail, setSelectedDetail] = useState<SalesDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        let url = "";
        let params = new URLSearchParams();
  
        if (period === "custom") {
          params.append("period", "daily");
          params.append("start", startDate);
          if (endDate) params.append("end", endDate);
        } else {
          params.append("period", period);
          params.append("date", startDate);
        }
  
        url = `/api/salesTransactionData?${params.toString()}`;
  
        const res = await fetch(url);
        const data: SalesData[] = await res.json();
  
        console.log("Sales Data:", data);
  
        if (Array.isArray(data)) {
          if (period === "custom" && startDate && endDate) {
            const fullDates = generateDateRange(startDate, endDate);
            const mappedData = fullDates.map((date) => {
              const found = data.find((d) => d.date === date);
              return {
                date,
                salesPerTransaction: found?.salesPerTransaction ?? 0,
              };
            });
        
            console.log("Mapped Custom Data:", mappedData);
            setSalesData(mappedData);
          } else {
            setSalesData(data);
          }
        }
        
         else {
          console.error("Data tidak dalam format array");
        }
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    }
  
    fetchSalesData();
  }, [period, startDate, endDate]);
  
  


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + "T00:00:00");
  
    if (["daily", "custom"].includes(period)) {
      return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } else if (period === "weekly") {
      const weekNumber = dateString.split("-W")[1];
      return `Minggu ke-${weekNumber}`;
    } else if (period === "monthly") {
      const [year, month] = dateString.split("-");
      const d = new Date(Number(year), Number(month) - 1);
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } else if (period === "yearly") {
      return dateString;
    }
    return "";
  };
  

  const handleBarClick = async (data: { payload: SalesData }) => {
    const clickedDate = data.payload.date;
    setLoadingDetail(true);
    try {
      const detailParams = new URLSearchParams({
        date: clickedDate,
        period
      });
      const res = await fetch(`/api/salesTransactionData/detail?${detailParams.toString()}`);
      const detailData: SalesDetail = await res.json();
      setSelectedDetail({
        date: clickedDate,
        summary: detailData.summary,
        details: detailData.details,
      });
    } catch (error) {
      console.error("Error fetching sales detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportData = salesData.map((item) => ({
    Tanggal: formatDate(item.date),
    "Sales per Transaction": item.salesPerTransaction.toFixed(2),
  }));

  const exportColumns = [
    { header: "Tanggal", key: "Tanggal" },
    { header: "Sales per Transaction", key: "Sales per Transaction" },
  ];

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">
        Grafik Sales per Transaction
      </h2>

      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-[#212121] font-medium">Dari:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>

        {period === "custom" && (
          <>
            <div className="flex gap-2 items-center">
              <label className="text-[#212121] font-medium">Sampai:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName="laporan_sales_per_transaction"
        />
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={salesData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#212121", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#212121", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFAF0",
              borderRadius: "8px",
              borderColor: "#4CAF50",
            }}
            labelFormatter={(value) => `Tanggal: ${formatDate(value)}`}
            formatter={(value) => [`${Number(value).toFixed(2)}`, "Sales per Transaction"]}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          <Bar
            dataKey="salesPerTransaction"
            fill="#4CAF50"
            radius={[8, 8, 0, 0]}
            onClick={handleBarClick}
          />
        </BarChart>
      </ResponsiveContainer>

      {selectedDetail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-2/3 max-h-screen overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Detail Sales per Transaction{" "}
                <span className="text-sm text-gray-500">
                  (Tanggal {formatDate(selectedDetail.date)})
                </span>
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            {loadingDetail ? (
              <p>Loading...</p>
            ) : (
              <div className="mt-4">
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p>
                    <strong>Net Sales:</strong> Rp{" "}
                    {Number(selectedDetail.summary.netSales).toLocaleString()}
                  </p>
                  <p>
                    <strong>Jumlah Transaksi:</strong>{" "}
                    {selectedDetail.summary.transactionCount}
                  </p>
                  <p>
                    <strong>Sales per Transaction:</strong>{" "}
                    {selectedDetail.summary.salesPerTransaction.toFixed(2)}
                  </p>
                </div>
                <h3 className="text-lg font-semibold mb-2">Detail Menu</h3>
                {selectedDetail.details.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Menu</th>
                        <th className="border px-2 py-1">Harga Jual</th>
                        <th className="border px-2 py-1">Jumlah Terjual</th>
                        <th className="border px-2 py-1">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.details.map((item, index) => (
                        <tr key={index}>
                          <td className="border px-2 py-1">{item.menuName}</td>
                          <td className="border px-2 py-1">
                            Rp {Number(item.sellingPrice).toLocaleString()}
                          </td>
                          <td className="border px-2 py-1">{item.quantity}</td>
                          <td className="border px-2 py-1">
                            Rp {Number(item.totalSales).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Tidak ada data detail untuk tanggal ini.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
