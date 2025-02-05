"use client";

import React from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const DashboardPage: React.FC = () => {
  const dashboardData = {
    grossSales: 829000,
    netSales: 484000,
    grossProfit: 158861,
    transactions: 11,
    avgSalePerTransaction: 44000,
    grossMargin: 32.82,
    items: [
      { name: "Dimsum", sold: 5, gross: 75000, net: 30000, profit: 30000 },
      { name: "Nasi Goreng Notarich", sold: 3, gross: 75000, net: 50000, profit: -1828 },
      { name: "Beef Teriyaki", sold: 3, gross: 99000, net: 33000, profit: -24804 },
    ],
  };

  const salesData = {
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        label: "Gross Sales",
        data: [200000, 450000, 1000000, 600000, 400000, 500000, 300000],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const categoryData = {
    labels: ["Snack", "Main Course", "Refresher", "Classic Coffee", "Iced Tea", "Others"],
    datasets: [
      {
        label: "Category Sales",
        data: [31.4, 28.9, 15.3, 13.2, 11.2, 5.0],
        backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#8a89a6"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="bg-white p-4 rounded shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-700">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-2 border rounded bg-gray-100">🏠 Notarich Cafe</span>
          <input type="date" className="border p-2 rounded text-gray-700" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
      </div>

      {/* Sales Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { label: "Gross Sales", value: `Rp. ${dashboardData.grossSales.toLocaleString()}` },
          { label: "Net Sales", value: `Rp. ${dashboardData.netSales.toLocaleString()}` },
          { label: "Gross Profit", value: `Rp. ${dashboardData.grossProfit.toLocaleString()}` },
          { label: "Transactions", value: dashboardData.transactions },
          { label: "Average Sale per Transaction", value: `Rp. ${dashboardData.avgSalePerTransaction.toLocaleString()}` },
          { label: "Gross Margin", value: `${dashboardData.grossMargin}%` },
        ].map((item, index) => (
          <div key={index} className="bg-white p-4 rounded shadow-md">
            <h2 className="text-gray-500 text-sm font-semibold">{item.label}</h2>
            <p className="text-xl font-bold text-gray-700">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Sales Charts */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold text-gray-700">Day of the Week Gross Sales</h2>
          <Bar data={salesData} />
        </div>
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold text-gray-700">Hourly Gross Sales</h2>
          <Line data={salesData} />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold text-gray-700">Category by Volume</h2>
          <Pie data={categoryData} />
        </div>
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold text-gray-700">Category by Sales</h2>
          <Pie data={categoryData} />
        </div>
      </div>

      {/* Top Items by Category */}
      <div className="mt-4 bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-bold text-gray-700">Top Items by Category</h2>
        <Bar data={salesData} />
      </div>
    </div>
  );
};

export default DashboardPage;
