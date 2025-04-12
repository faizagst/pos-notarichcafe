"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ExportButton } from "./ExportButton";

const COLORS = ["#FF8A00", "#975F2C", "#8A4210", "#92700C", "#212121"];

// Interface untuk data top seller
interface TopSeller {
    menuName: string;
    totalSold: number;
}

export default function TopSellers() {
    const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
    const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
    const [date, setDate] = useState<string>("");

    useEffect(() => {
        async function fetchTopSellers() {
            try {
                let url = `/api/topSellers?period=${period}`;
                if (date) {
                    url += `&date=${date}`;
                }
                const res = await fetch(url);
                const data: { topSellers: TopSeller[] } = await res.json();
                setTopSellers(data.topSellers);
            } catch (error) {
                console.error("Error fetching top sellers:", error);
            }
        }
        fetchTopSellers();
    }, [period, date]);

    // Data untuk ExportButton
    const exportData = topSellers.map((item) => ({
        Menu: item.menuName,
        "Total Terjual": item.totalSold,
        "Menu Terlaris": topSellers[0]?.menuName === item.menuName
            ? `${item.menuName} (${item.totalSold} terjual)`
            : "",
    }));

    const exportColumns = [
        { header: "Menu", key: "Menu" },
        { header: "Total Terjual", key: "Total Terjual" },
        { header: "Menu Terlaris", key: "Menu Terlaris" },
    ];

    return (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg w-full">
            <h2 className="text-xl font-semibold text-[#8A4210] mb-3">📊 Produk Terlaris</h2>

            {/* Dropdown Pilihan Periode */}
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="period" className="text-sm text-gray-700 font-medium">
                    Periode:
                </label>
                <select
                    id="period"
                    value={period}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPeriod(e.target.value as "daily" | "weekly" | "monthly" | "yearly")
                    }
                    className="p-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                    <option value="yearly">Tahunan</option>
                </select>
            </div>

            {/* Input Tanggal */}
            <div className="mb-3 flex items-center gap-2">
                <label className="text-sm text-gray-700 font-medium">Tanggal:</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                    className="p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                />
            </div>

            {/* Tombol Ekspor dengan ExportButton */}
            <div className="mb-3 flex gap-2">
                <ExportButton
                    data={exportData}
                    columns={exportColumns}
                    fileName="laporan_top_sellers"
                />
            </div>

            {/* Layout: Daftar Menu Terlaris dan Pie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Daftar Menu Terlaris */}
                <div className="overflow-x-auto">
                    <ul className="space-y-2">
                        {topSellers.map((item, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="font-medium flex-1 whitespace-normal">
                                    {index === 0 && <span className="text-[#FF8A00]">Terlaris: </span>}
                                    {item.menuName} - {item.totalSold} terjual
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
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
                                outerRadius={60}
                                fill="#8884d8"
                                labelLine={false}
                                label={false}
                            >
                                {topSellers.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}