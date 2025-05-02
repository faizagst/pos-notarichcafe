"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { ExportButton } from "@/components/ExportButton";

// Warna kategori
const COLORS = ["#FF8A00", "#8A4210", "#975F2C", "#92700C", "#212121"];

// Fungsi format angka ke Rupiah
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
};

export default function RevenueByCategoryChart() {
  const [data, setData] = useState<{ category: string; total: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/revenueByCategory");
        const jsonData = await res.json();

        // Menghindari duplikasi kategori dengan mengelompokkan berdasarkan kategori
        const uniqueData = jsonData.reduce((acc: Record<string, number>, item: { category: string; total: number }) => {
          acc[item.category] = (acc[item.category] || 0) + item.total;
          return acc;
        }, {});

        // Konversi objek hasil pengelompokan ke array
        const formattedData = Object.entries(uniqueData).map(([category, total]) => ({
          category,
          total: Number(total),
        }));
        setData(formattedData);
      } catch (error) {
        console.error("Error fetching revenue by category:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="mt-8 p-6 bg-[#F8F8F8] rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-[#8A4210] mb-6">💰 Pendapatan per Kategori Menu</h2>

      {/* Tombol Ekspor dengan komponen baru */}
      <div className="mb-6">
        <ExportButton
          data={data.map((item) => ({
            Kategori: item.category,
            "Total Pendapatan": formatCurrency(item.total),
          }))}
          columns={[
            { header: "Kategori", key: "Kategori" },
            { header: "Total Pendapatan", key: "Total Pendapatan" },
          ]}
          fileName="laporan_pendapatan_kategori"
          dropdownAlign="left"
        />
      </div>

      {/* Ringkasan Pendapatan per Kategori */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {data.map((item, index) => (
          <div key={`${item.category}-${index}`} className="p-4 bg-[#FCFFFC] shadow-md rounded-lg">
            <h3 className="text-lg font-semibold text-[#212121]">{item.category}</h3>
            <p className="text-[#FF8A00] font-bold">
              {formatCurrency(item.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Grafik Pendapatan */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="category" tick={{ fill: "#212121", fontSize: 14 }} />
          <YAxis tick={{ fill: "#212121", fontSize: 14 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#FF8A00", color: "#FCFFFC", borderRadius: 8, border: "none" }}
            cursor={{ fill: "rgba(255, 138, 0, 0.2)" }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ color: "#212121" }} />
          <Bar dataKey="total" fill="#FF8A00" radius={[10, 10, 0, 0]}>
            {data.map((item, index) => (
              <Cell key={`${item.category}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
