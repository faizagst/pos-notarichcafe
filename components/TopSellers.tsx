"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExportButton } from "./ExportButton";

const COLORS = ["#FF8A00", "#975F2C", "#8A4210", "#92700C", "#212121"];

interface TopSeller {
  menuName: string;
  totalSold: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

export default function TopSellers() {
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [period, setPeriod] = useState<Period>("daily");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    async function fetchTopSellers() {
      try {
        let url = `/api/topSellers?period=${period}`;
        if (date) {
          url += `&date=${date}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        // Debug: log data
        console.log("Top Sellers Fetched:", data);
        const sellers: TopSeller[] = Array.isArray(data.topSellers)
        ? data.topSellers
            .filter((item: any) => item.menuName && item.totalSold)
            .map((item: any) => ({
              menuName: item.menuName,
              totalSold: Number(item.totalSold),
            }))
        : [];
      
        setTopSellers(sellers);
      } catch (error) {
        console.error("Error fetching top sellers:", error);
      }
    }

    fetchTopSellers();
  }, [period, date]);

  const totalCount = topSellers.reduce((acc, item) => acc + item.totalSold, 0);

  const exportData = topSellers.map((item) => ({
    Menu: item.menuName,
    "Total Terjual": item.totalSold,
    "Menu Terlaris":
      topSellers[0]?.menuName === item.menuName
        ? `${item.menuName} (${item.totalSold} terjual)`
        : "",
  }));

  const exportColumns = [
    { header: "Menu", key: "Menu" },
    { header: "Total Terjual", key: "Total Terjual" },
    { header: "Menu Terlaris", key: "Menu Terlaris" },
  ];

  const renderLegend = () => {
    return (
      <div className="flex flex-col gap-2">
        {topSellers.map((entry, index) => {
          const percentage =
            totalCount > 0
              ? ((entry.totalSold / totalCount) * 100).toFixed(2)
              : "0.00";
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <div className="text-sm flex-1 whitespace-normal">
                <strong>{entry.menuName}</strong>: {entry.totalSold} terjual (
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
      <h2 className="text-2xl font-bold text-[#8A4210] mb-4">📊 Produk Terlaris</h2>

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

      <div className="mb-4">
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName="laporan_top_sellers"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Legend */}
        <div className="sm:w-1/3">{renderLegend()}</div>

        {/* Pie Chart */}
        <div className="sm:w-2/3 h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={topSellers}
                dataKey="totalSold"
                nameKey="menuName"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={false}
              >
                {topSellers.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} terjual`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
