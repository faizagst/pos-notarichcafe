"use client";

import { useState, useEffect, Fragment } from "react";

// ======= TIPE DATA SESUAI API RESPONSE =======
interface Metrics {
  totalSales: number; // Uang yang diterima (finalTotal)
  transactions: number;
  grossProfit: number; 
  netProfit: number;
  discounts: number;
  tax: number;
  gratuity: number;
}

interface AppliedModifierInfo {
    modifierId: number;
    name: string;
    quantity: number; 
    unitPrice: number; 
    unitHpp: number;   
}

interface OrderItemDetail {
  id: number; 
  quantity: number;
  price: number; 
  itemDiscount: number; 
  menu: {
    id: number;
    name: string;
    price: number; // Harga satuan master menu
    hargaBakul: number; // HPP satuan master menu
  };
  modifiersApplied: AppliedModifierInfo[]; 
}

interface OrderDetail {
  id: number; 
  createdAt: string;
  total: number; // Pendapatan kotor pesanan (co.total)
  discountAmount: number; 
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number; 
  orderItems: OrderItemDetail[];
}

interface TransactionDetail {
  id: number;
  createdAt: string;
  total: number; // finalTotal (uang yang diterima)
  itemCount: number;
  menus: string[]; 
}

interface GrossProfitDetailItem {
  orderId: number;
  orderDate: string;
  orderItemId: number; 
  menuName: string; 
  quantity: number;
  lineGrossValue: number; 
  totalAllocatedDiscountToLine: number; 
  netSalesForLine: number; 
  cogsForLine: number; 
  grossProfitForLine: number; 
}

interface NetProfitDetailItem {
  orderId: number;
  orderDate: string;
  orderItemId: number; 
  menuName: string; 
  quantity: number;
  netSalesForLine: number; 
  cogsForLine: number;     
  allocatedTaxToLine: number; 
  allocatedGratuityToLine: number; 
  netProfitForLine: number; 
}

interface SalesDetailsResponse {
  summary?: { explanation: string; [key: string]: string | number };
  details: OrderDetail[] | TransactionDetail[] | GrossProfitDetailItem[] | NetProfitDetailItem[];
  message?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

interface ModalData {
  title: string;
  metric: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity";
  summary?: {
    explanation: string;
    [key: string]: string | number;
  };
  data: OrderDetail[] | TransactionDetail[] | GrossProfitDetailItem[] | NetProfitDetailItem[];
}

interface SalesDetailsModalProps {
  title: string;
  summary?: {
    explanation: string;
    [key: string]: string | number;
  };
  metric: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity";
  data: OrderDetail[] | TransactionDetail[] | GrossProfitDetailItem[] | NetProfitDetailItem[];
  onClose: () => void;
}

const formatCurrency = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  percentage,
  icon,
  color,
  onClick,
}) => {
  const isPositive = percentage.startsWith("+");
  const percentageColor = isPositive ? "text-green-500" : percentage.startsWith("-") ? "text-red-500" : "text-gray-500";
  
  return (
    <div
      className="p-6 bg-white shadow-md rounded-xl flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer"
      onClick={onClick}
    >
      <div className={`text-4xl ${color}`}>{icon}</div>
      <div>
        <div className="text-lg font-semibold text-[#212121]">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-sm ${percentageColor}`}>{percentage}</div>
      </div>
    </div>
  );
};

// ======= COMPONENT MODAL DETAIL PENJUALAN (Gaya Tabel Dikembalikan ke Awal) =======
const SalesDetailsModal: React.FC<SalesDetailsModalProps> = ({
  title,
  summary,
  metric,
  data,
  onClose,
}) => {
  const renderTableHeader = () => {
    const thClass = "border p-2 text-left"; 
    const thClassRight = "border p-2 text-right";

    switch (metric) {
      case "sales": 
        return (
          <tr>
            <th className={thClass}>ID Pesanan</th>
            <th className={thClass}>Tanggal</th>
            <th className={thClassRight}>Total Kotor</th>
            <th className={thClassRight}>Diskon Pesanan</th>
            <th className={thClassRight}>Pajak</th>
            <th className={thClassRight}>Gratuity</th>
            <th className={thClassRight}>Total Diterima</th>
            <th className={thClass}>Items & Modifiers</th>
          </tr>
        );
      case "transactions":
        return (
          <tr>
            <th className={thClass}>ID Transaksi</th>
            <th className={thClass}>Tanggal</th>
            <th className={thClassRight}>Total Diterima</th>
            <th className={thClassRight}>Jumlah Item</th>
            <th className={thClass}>Menu</th>
          </tr>
        );
      case "gross":
        return (
          <tr>
            <th className={thClass}>ID Pesanan</th>
            <th className={thClass}>Tanggal</th>
            <th className={thClass}>ID Item Pesanan</th>
            <th className={thClass}>Menu (+ Modifier)</th>
            <th className={thClassRight}>Kuantitas</th>
            <th className={thClassRight}>Gross Sales</th>
            <th className={thClassRight}>Total Diskon</th>
            <th className={thClassRight}>Net Sales</th>
            <th className={thClassRight}>COGS/HPP</th>
            <th className={thClassRight}>Laba Kotor</th>
          </tr>
        );
      case "net":
        return (
          <tr>
            <th className={thClass}>ID Pesanan</th>
            <th className={thClass}>Tanggal</th>
            <th className={thClass}>ID Item Pesanan</th>
            <th className={thClass}>Menu (+ Modifier)</th>
            <th className={thClassRight}>Kuantitas</th>
            <th className={thClassRight}>Net Sales</th>
            <th className={thClassRight}>COGS/HPP</th>
            <th className={thClassRight}>Pajak</th>
            <th className={thClassRight}>Gratuity</th>
            <th className={thClassRight}>Laba Bersih</th>
          </tr>
        );
      case "discounts":
      case "tax":
      case "gratuity":
        return (
          <tr>
            <th className={thClass}>ID Pesanan</th>
            <th className={thClass}>Tanggal</th>
            <th className={thClassRight}>Nilai {metric.charAt(0).toUpperCase() + metric.slice(1)} Pesanan</th>
            <th className={thClass}>Items & Modifiers</th> 
          </tr>
        );
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    const tdClass = "border p-2";
    const tdClassRight = "border p-2 text-right";

    switch (metric) {
      case "sales":
        return (data as OrderDetail[]).map((order) => (
          <Fragment key={`order-sales-${order.id}`}>
            <tr> 
              <td className={tdClass}>{order.id}</td>
              <td className={tdClass}>{new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className={tdClassRight}>{formatCurrency(order.total)}</td>
              <td className={tdClassRight}>{formatCurrency(order.discountAmount)}</td>
              <td className={tdClassRight}>{formatCurrency(order.taxAmount)}</td>
              <td className={tdClassRight}>{formatCurrency(order.gratuityAmount)}</td>
              <td className={tdClassRight}>{formatCurrency(order.finalTotal)}</td>
              <td className={tdClass}>
                {order.orderItems.map((item, itemIndex) => (
                  <div key={`orderitem-sales-${item.id}`} className={`py-1 ${itemIndex > 0 ? 'mt-1 border-t border-gray-300 pt-1' : ''}`}>
                    <div><span className="font-medium">{item.menu.name}</span> x{item.quantity}</div>
                    <div className="text-xs text-gray-500">(Harga: {formatCurrency(item.price)}, Diskon: {formatCurrency(item.itemDiscount)})</div>
                    {item.modifiersApplied && item.modifiersApplied.length > 0 && (
                      <div className="pl-3 mt-1 text-xs text-gray-600">
                        <span className="font-semibold">Modifiers:</span>
                        {item.modifiersApplied.map(mod => (
                          <div key={`mod-sales-${item.id}-${mod.modifierId}`} className="pl-2">
                            └ {mod.name} (Qty: {mod.quantity}, Harga: {formatCurrency(mod.unitPrice)})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </td>
            </tr>
          </Fragment>
        ));
      case "transactions":
        return (data as TransactionDetail[]).map((tx) => (
          <tr key={`tx-${tx.id}`}>
            <td className={tdClass}>{tx.id}</td>
            <td className={tdClass}>{new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td className={tdClassRight}>{formatCurrency(tx.total)}</td>
            <td className={tdClassRight}>{tx.itemCount}</td>
            <td className={tdClass}>{tx.menus.join(", ")}</td>
          </tr>
        ));
        case "gross":
          return (data as GrossProfitDetailItem[]).map((item) => (
            <tr key={`gross-${item.orderItemId}`}>
              <td className={tdClass}>{item.orderId}</td>
              <td className={tdClass}>{new Date(item.orderDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className={tdClass}>{item.orderItemId}</td>
              <td className={tdClass}>{item.menuName}</td>
              <td className={tdClassRight}>{item.quantity}</td>
              <td className={tdClassRight}>{formatCurrency(item.lineGrossValue)}</td>
              <td className={tdClassRight}>{formatCurrency(item.totalAllocatedDiscountToLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.netSalesForLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.cogsForLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.grossProfitForLine)}</td>
            </tr>
          ));
        
        case "net":
          return (data as NetProfitDetailItem[]).map((item) => (
            <tr key={`net-${item.orderItemId}`}>
              <td className={tdClass}>{item.orderId}</td>
              <td className={tdClass}>{new Date(item.orderDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className={tdClass}>{item.orderItemId}</td>
              <td className={tdClass}>{item.menuName}</td>
              <td className={tdClassRight}>{item.quantity}</td>
              <td className={tdClassRight}>{formatCurrency(item.netSalesForLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.cogsForLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.allocatedTaxToLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.allocatedGratuityToLine)}</td>
              <td className={tdClassRight}>{formatCurrency(item.netProfitForLine)}</td>
            </tr>
          ));
      case "discounts":
      case "tax":
      case "gratuity":
        return (data as OrderDetail[]).map((order) => (
            <tr key={`order-simple-${order.id}`}>
                <td className={tdClass}>{order.id}</td>
                <td className={tdClass}>{new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className={tdClassRight}>
                {formatCurrency(
                    metric === "discounts" ? order.discountAmount :
                    metric === "tax" ? order.taxAmount :
                    order.gratuityAmount
                )}
                </td>
                <td className={tdClass}> 
                  {/* Menampilkan rincian item dan modifier untuk konteks */}
                  {order.orderItems.map((item, itemIndex) => (
                    <div key={`item-detail-${order.id}-${item.id}`} className={`${itemIndex > 0 ? 'mt-1 pt-1 border-t border-gray-200' : ''}`}>
                      <span>{item.menu.name} x{item.quantity}</span>
                      {item.modifiersApplied && item.modifiersApplied.length > 0 && (
                        <span className="text-xs text-gray-500"> (w/ {item.modifiersApplied.map(m => m.name).join(', ')})</span>
                      )}
                    </div>
                  ))}
                </td>
            </tr>
        ));
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-11/12 max-h-screen overflow-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        {summary && (
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <p className="mb-2 text-sm text-gray-700">
              <strong>Info:</strong> {summary.explanation}
            </p>
            {Object.keys(summary)
              .filter((key) => key !== "explanation")
              .map((key) => (
                <p key={key} className="text-sm text-gray-700">
                  <strong>{key}:</strong> {summary[key]}
                </p>
              ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
                {renderTableHeader()}
            </thead>
            <tbody className="divide-y divide-gray-200">{renderTableRows()}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getPreviousDate(dateString: string, period: string): string {
  const date = new Date(dateString);
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
}

export default function StatsCards() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<Metrics | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllMetrics() {
      setLoadingMetrics(true);
      try {
        const currentRes = await fetch(
          `/api/salesMetrics?period=${selectedPeriod}&date=${selectedDate}`
        );
        if (!currentRes.ok) throw new Error(`Failed to fetch current metrics: ${currentRes.statusText}`);
        const currentData: Metrics = await currentRes.json();
        setCurrentMetrics(currentData);
        
        const prevRes = await fetch(
          `/api/salesMetrics?period=${selectedPeriod}-prev&date=${selectedDate}`
        );

        if (!prevRes.ok) throw new Error(`Failed to fetch previous metrics: ${prevRes.statusText}`);
        const prevData: Metrics = await prevRes.json();
        setPreviousMetrics(prevData);

      } catch (error) {
        console.error("Error fetching metrics:", error);
        setCurrentMetrics(null); 
        setPreviousMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    }
    fetchAllMetrics();
  }, [selectedPeriod, selectedDate]);

  const getPercentageChange = (current: number | undefined, previous: number | undefined) => {
    if (current === undefined || previous === undefined) return "N/A";
    if (previous === 0) return current > 0 ? "+100%" : current < 0 ? "-100%" : "0.00%"; 
    const change = ((current - previous) / Math.abs(previous)) * 100; 
    return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
  };
  

  const handleCardClick = async (
    type: "sales" | "transactions" | "gross" | "net" | "discounts" | "tax" | "gratuity"
  ) => {
    try {
      const res = await fetch(
        `/api/salesMetrics/detail?metric=${type}&period=${selectedPeriod}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error(`Failed to fetch detail data for ${type}: ${res.statusText}`);
      const response: SalesDetailsResponse = await res.json(); 
      
      let title = "";
      switch (type) {
        case "sales": title = "Detail Total Collected (Uang Diterima)"; break;
        case "transactions": title = "Detail Transaksi"; break;
        case "gross": title = "Detail Laba Kotor"; break;
        case "net": title = "Detail Laba Bersih"; break;
        case "discounts": title = "Detail Diskon"; break;
        case "tax": title = "Detail Pajak"; break;
        case "gratuity": title = "Detail Gratuity"; break;
        default: title = "Detail Penjualan";
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
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
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

      {loadingMetrics ? (
         <div className="text-center py-10 text-gray-500">Memuat metrik...</div>
      ) : currentMetrics && previousMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Collected"
              value={`${formatCurrency(currentMetrics.totalSales)}`}
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
              value={currentMetrics.transactions.toLocaleString('id-ID')}
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
              value={`${formatCurrency(currentMetrics.grossProfit)}`}
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
              value={`${formatCurrency(currentMetrics.netProfit)}`}
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
              value={`${formatCurrency(currentMetrics.discounts)}`}
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
              value={`${formatCurrency(currentMetrics.tax)}`}
              percentage={getPercentageChange(currentMetrics.tax, previousMetrics.tax)}
              icon="🏦"
              color="text-red-500"
              onClick={() => handleCardClick("tax")}
            />
            <StatCard
              title="Gratuity"
              value={`${formatCurrency(currentMetrics.gratuity)}`}
              percentage={getPercentageChange(
                currentMetrics.gratuity,
                previousMetrics.gratuity
              )}
              icon="💳"
              color="text-teal-500"
              onClick={() => handleCardClick("gratuity")}
            />
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">Gagal memuat data metrik atau data periode sebelumnya.</div>
      )}

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
