"use client";

import { useState, useEffect } from "react";

// ======= TIPE DATA =======
interface Metrics {
  totalSales: number; // finalTotal
  transactions: number;
  grossProfit: number; // Gross Sales
  netProfit: number; // Net Sales
  discounts: number;
  tax: number;
  gratuity: number;
}

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  discountAmount: number;
  menu: {
    id: number;
    name: string;
    price: number;
    hargaBakul: number;
  };
}

interface Order {
  id: number;
  createdAt: string;
  total: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  orderItems: OrderItem[];
}

interface TransactionDetail {
  id: number;
  createdAt: string;
  total: number;
  itemCount: number;
  menus: string[];
}

interface GrossDetail {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number; 
  sellingPrice: number;
  quantity: number;
  itemTotalSelling: number;
  hpp: number;
  itemTotalHPP: number;
}

interface NetDetail {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number; 
  sellingPrice: number;
  discount: number;
  tax: number;
  gratuity: number;
  quantity: number;
  itemNetProfit: number;
}

interface ModalData {
  title: string;
  metric: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity";
  summary?: {
    explanation: string;
    [key: string]: string | number;
  };
  data: Order[] | TransactionDetail[] | GrossDetail[] | NetDetail[];
}

interface SalesDetailsModalProps {
  title: string;
  summary?: {
    explanation: string;
    [key: string]: string | number;
  };
  metric: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity";
  data: Order[] | TransactionDetail[] | GrossDetail[] | NetDetail[];
  onClose: () => void;
}

// ======= COMPONENT STAT CARD =======
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  percentage,
  icon,
  color,
  onClick,
}) => (
  <div
    className="p-6 bg-white shadow-md rounded-xl flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer"
    onClick={onClick}
  >
    <div className={`text-4xl ${color}`}>{icon}</div>
    <div>
      <div className="text-lg font-semibold text-[#212121]">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{percentage}</div>
    </div>
  </div>
);

// ======= COMPONENT MODAL DETAIL PENJUALAN =======
const SalesDetailsModal: React.FC<SalesDetailsModalProps> = ({
  title,
  summary,
  metric,
  data,
  onClose,
}) => {
  const renderTableHeader = () => {
    switch (metric) {
      case "sales":
        return (
          <tr>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Items</th>
          </tr>
        );
      case "transactions":
        return (
          <tr>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Jumlah Item</th>
            <th className="border p-2">Menu</th>
          </tr>
        );
      case "gross":
        return (
          <tr>
            <th className="border p-2">Order ID</th>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Menu</th>
            <th className="border p-2">Harga Jual</th>
            <th className="border p-2">Jumlah</th>
            <th className="border p-2">Total Sales</th>
            <th className="border p-2">HPP</th>
            <th className="border p-2">Total HPP</th>
          </tr>
        );
      case "net":
        return (
          <tr>
            <th className="border p-2">Order ID</th>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Menu</th>
            <th className="border p-2">Harga Jual</th>
            <th className="border p-2">Diskon</th>
            <th className="border p-2">Pajak</th>
            <th className="border p-2">Gratuity</th>
            <th className="border p-2">Jumlah</th>
            <th className="border p-2">Total Net</th>
          </tr>
        );
      case "discounts":
      case "tax":
      case "gratuity":
        return (
          <tr>
            <th className="border p-2">Order ID</th>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">Nilai</th>
          </tr>
        );
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    switch (metric) {
      case "sales":
        return (data as Order[]).map((order) => (
          <tr key={order.id}>
            <td className="border p-2">{new Date(order.createdAt).toLocaleDateString()}</td>
            <td className="border p-2">Rp {Number(order.finalTotal).toLocaleString()}</td>
            <td className="border p-2">
              {order.orderItems.map((item) => (
                <div key={item.id}>
                  {item.menu.name} x{item.quantity}
                </div>
              ))}
            </td>
          </tr>
        ));
      case "transactions":
        return (data as TransactionDetail[]).map((tx) => (
          <tr key={tx.id}>
            <td className="border p-2">{new Date(tx.createdAt).toLocaleDateString()}</td>
            <td className="border p-2">Rp {Number(tx.total).toLocaleString()}</td>
            <td className="border p-2">{tx.itemCount}</td>
            <td className="border p-2">{tx.menus.join(", ")}</td>
          </tr>
        ));
        case "gross":
          return (data as GrossDetail[]).map((item) => (
            <tr key={`${item.orderId}-${item.itemId}-${item.menuName}`}>
              <td className="border p-2">{item.orderId}</td>
              <td className="border p-2">{new Date(item.orderDate).toLocaleDateString()}</td>
              <td className="border p-2">{item.menuName}</td>
              <td className="border p-2">Rp {Number(item.sellingPrice).toLocaleString()}</td>
              <td className="border p-2">{item.quantity}</td>
              <td className="border p-2">Rp {Number(item.itemTotalSelling).toLocaleString()}</td>
              <td className="border p-2">Rp {Number(item.hpp).toLocaleString()}</td>
              <td className="border p-2">Rp {Number(item.itemTotalHPP).toLocaleString()}</td>
            </tr>
          ));
        
        case "net":
          return (data as NetDetail[]).map((item) => (
            <tr key={`${item.orderId}-${item.itemId}-${item.menuName}`}>
              <td className="border p-2">{item.orderId}</td>
              <td className="border p-2">{new Date(item.orderDate).toLocaleDateString()}</td>
              <td className="border p-2">{item.menuName}</td>
              <td className="border p-2">Rp {Number(item.sellingPrice).toLocaleString()}</td>
              <td className="border p-2">Rp {Number(item.discount).toLocaleString()}</td>
              <td className="border p-2">Rp {Number(item.tax).toLocaleString()}</td>
              <td className="border p-2">Rp {Number(item.gratuity).toLocaleString()}</td>
              <td className="border p-2">{item.quantity}</td>
              <td className="border p-2">Rp {Number(item.itemNetProfit).toLocaleString()}</td>
            </tr>
          ));
      case "discounts":
      case "tax":
      case "gratuity":
        return (data as Order[]).map((order) => (
          <tr key={order.id}>
            <td className="border p-2">{order.id}</td>
            <td className="border p-2">{new Date(order.createdAt).toLocaleDateString()}</td>
            <td className="border p-2">
              Rp{" "}
              {Number(
                metric === "discounts"
                  ? order.discountAmount
                  : metric === "tax"
                  ? order.taxAmount
                  : order.gratuityAmount
              ).toLocaleString()}
            </td>
          </tr>
        ));
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg w-11/12 max-h-screen overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        {summary && (
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <p className="mb-2">
              <strong>Info:</strong> {summary.explanation}
            </p>
            {Object.keys(summary)
              .filter((key) => key !== "explanation")
              .map((key) => (
                <p key={key}>
                  <strong>{key}:</strong> {summary[key]}
                </p>
              ))}
          </div>
        )}
        <table className="w-full">
          <thead>{renderTableHeader()}</thead>
          <tbody>{renderTableRows()}</tbody>
        </table>
      </div>
    </div>
  );
};

// ======= HELPER: HITUNG TANGGAL SEBELUMNYA =======
function getPreviousDate(dateString: string, period: string): string {
  const date = new Date(dateString);
  switch (period) {
    case "daily":
    case "daily-prev":
      date.setDate(date.getDate() - 1);
      break;
    case "weekly":
    case "weekly-prev":
      date.setDate(date.getDate() - 7);
      break;
    case "monthly":
    case "monthly-prev":
      date.setMonth(date.getMonth() - 1);
      break;
    case "yearly":
    case "yearly-prev":
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      break;
  }
  return date.toISOString().split("T")[0];
}

// ======= COMPONENT UTAMA: STATS CARDS =======
export default function StatsCards() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<Metrics | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    async function fetchCurrentMetrics() {
      try {
        const res = await fetch(
          `/api/salesMetrics?period=${selectedPeriod}&date=${selectedDate}`
        );
        const data: Metrics = await res.json();
        setCurrentMetrics(data);
      } catch (error) {
        console.error("Error fetching current metrics:", error);
      }
    }
    fetchCurrentMetrics();
  }, [selectedPeriod, selectedDate]);

  useEffect(() => {
    async function fetchPreviousMetrics() {
      try {
        const previousDate = getPreviousDate(selectedDate, selectedPeriod);
        const res = await fetch(
          `/api/salesMetrics?period=${selectedPeriod}&date=${previousDate}`
        );
        const data: Metrics = await res.json();
        setPreviousMetrics(data);
      } catch (error) {
        console.error("Error fetching previous metrics:", error);
      }
    }
    fetchPreviousMetrics();
  }, [selectedPeriod, selectedDate]);

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "100.00%" : "0.00%";
    const change = ((current - previous) / previous) * 100;
    return `${change.toFixed(2)}%`;
  };

  const handleCardClick = async (
    type: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity"
  ) => {
    try {
      const res = await fetch(
        `/api/salesMetrics/detail?metric=${type}&period=${selectedPeriod}&date=${selectedDate}`
      );
      const response: {
        summary?: { explanation: string; [key: string]: string | number };
        details: Order[] | TransactionDetail[] | GrossDetail[] | NetDetail[];
      } = await res.json();
      let title = "";
      switch (type) {
        case "sales":
          title = "Detail Total Penjualan";
          break;
        case "transactions":
          title = "Detail Transaksi";
          break;
        case "gross":
          title = "Detail Laba Kotor";
          break;
        case "net":
          title = "Detail Laba Bersih";
          break;
        case "discounts":
          title = "Detail Diskon";
          break;
        case "tax":
          title = "Detail Pajak";
          break;
        case "gratuity":
          title = "Detail Gratuity";
          break;
        default:
          title = "Detail Penjualan";
      }
      setModalData({
        title,
        metric: type,
        summary: response.summary,
        data: response.details,
      });
      setModalVisible(true);
    } catch (error) {
      console.error("Error fetching detail data:", error);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          >
            <option value="daily">Hari Ini</option>
            <option value="daily-prev">Hari Sebelumnya</option>
            <option value="weekly">Minggu Ini</option>
            <option value="weekly-prev">Minggu Lalu</option>
            <option value="monthly">Bulan Ini</option>
            <option value="monthly-prev">Bulan Lalu</option>
            <option value="yearly">Tahun Ini</option>
            <option value="yearly-prev">Tahun Lalu</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="date" className="text-[#212121] font-medium">
            Pilih Tanggal:
          </label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {currentMetrics && previousMetrics && (
          <>
            <StatCard
              title="Total Penjualan"
              value={`Rp ${currentMetrics.totalSales.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.totalSales,
                previousMetrics.totalSales
              )}
              icon="💰"
              color="text-green-500"
              onClick={() => handleCardClick("sales")}
            />
            <StatCard
              title="Transaksi"
              value={currentMetrics.transactions.toLocaleString()}
              percentage={getPercentageChange(
                currentMetrics.transactions,
                previousMetrics.transactions
              )}
              icon="📦"
              color="text-blue-500"
              onClick={() => handleCardClick("transactions")}
            />
            <StatCard
              title="Laba Kotor"
              value={`Rp ${currentMetrics.grossProfit.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.grossProfit,
                previousMetrics.grossProfit
              )}
              icon="📈"
              color="text-purple-500"
              onClick={() => handleCardClick("gross")}
            />
            <StatCard
              title="Laba Bersih"
              value={`Rp ${currentMetrics.netProfit.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.netProfit,
                previousMetrics.netProfit
              )}
              icon="💵"
              color="text-pink-500"
              onClick={() => handleCardClick("net")}
            />
            <StatCard
              title="Diskon"
              value={`Rp ${currentMetrics.discounts.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.discounts,
                previousMetrics.discounts
              )}
              icon="🎁"
              color="text-orange-500"
              onClick={() => handleCardClick("discounts")}
            />
            <StatCard
              title="Pajak"
              value={`Rp ${currentMetrics.tax.toLocaleString()}`}
              percentage={getPercentageChange(currentMetrics.tax, previousMetrics.tax)}
              icon="🏦"
              color="text-red-500"
              onClick={() => handleCardClick("tax")}
            />
            <StatCard
              title="Gratuity"
              value={`Rp ${currentMetrics.gratuity.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.gratuity,
                previousMetrics.gratuity
              )}
              icon="💳"
              color="text-teal-500"
              onClick={() => handleCardClick("gratuity")}
            />
          </>
        )}
      </div>

      {modalVisible && modalData && (
        <SalesDetailsModal
          title={modalData.title}
          summary={modalData.summary}
          metric={modalData.metric}
          data={modalData.data}
          onClose={() => setModalVisible(false)}
        />
      )}
    </div>
  );
}