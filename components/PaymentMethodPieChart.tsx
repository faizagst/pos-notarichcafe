"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#FF8A00", "#975F2C", "#8A4210", "#92700C", "#212121"];

type Period = "daily" | "weekly" | "monthly" | "yearly";

interface PaymentMethodData {
  paymentMethod: string;
  count: number;
  totalRevenue: number;
}

export default function PaymentMethodPieChart() {
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [period, setPeriod] = useState<Period>("daily");
  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    async function fetchData() {
      try {
        let url = `/api/paymentMethodStats?period=${period}`;
        if (date) {
          url += `&date=${date}`;
        }
        const res = await fetch(url);
        const result = await res.json();
        // Pastikan result adalah array
        const fetchedData: PaymentMethodData[] = Array.isArray(result)
          ? result
          : [result];
        setData(fetchedData);
        const total = fetchedData.reduce(
          (acc: number, item: PaymentMethodData) => acc + Number(item.count),
          0
        );
        setTotalCount(total);
      } catch (error) {
        console.error("Error fetching payment method stats:", error);
      }
    }
    fetchData();
  }, [period, date]);

  const renderLegend = () => {
    return (
      <div className="flex flex-col gap-2">
        {data.map((entry, index) => {
          const percentage =
            totalCount > 0 ? ((entry.count / totalCount) * 100).toFixed(2) : "0.00";
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <div className="text-sm flex-1 whitespace-normal">
                <strong>{entry.paymentMethod}</strong>: {entry.count} transaksi (
                {percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg w-full">
      <h2 className="text-2xl font-bold text-[#8A4210] mb-4">Metode Pembayaran</h2>
      {/* Pilihan periode dan tanggal */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <div>
          <label className="text-[#212121] font-medium mr-2">Pilih Periode:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="p-2 bg-[#FCFFFC] text-[#212121] border border-[#8A4210] rounded-md cursor-pointer hover:bg-[#FF8A00] hover:text-white transition-all"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[#212121] font-medium">Tanggal:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Custom Legend */}
        <div className="sm:w-1/3">{renderLegend()}</div>
        {/* Pie Chart */}
        <div className="sm:w-2/3 h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="paymentMethod"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={false  }
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} transaksi`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
