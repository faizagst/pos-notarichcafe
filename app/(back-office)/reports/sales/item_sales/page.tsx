'use client'
import { useState } from "react";
import Tabs from "@/components/TabsItemSales";

type SalesData = {
  name: string;
  category: string;
  itemSold?: number;
  itemRefunded?: number;
  grossSales?: number;
  discounts?: number;
  aLaCarte?: number;
  bundle?: number;
  refundedAlaCarte?: number;
  refundedBundle?: number;
};

const incomeData: SalesData[] = [
  { name: "Beef Teriyaki", category: "MAIN COURSE", itemSold: 1, itemRefunded: 0, grossSales: 33000, discounts: 0 },
  { name: "Chicken Salted Egg + Classic Tea", category: "Bundle_Package", itemSold: 1, itemRefunded: 0, grossSales: 36000, discounts: 0 },
  { name: "Chocolate - Ice", category: "REFRESHER", itemSold: 1, itemRefunded: 0, grossSales: 22000, discounts: 0 },
  { name: "Filter Coffee - Kerinci Lactic Nat...", category: "CLASSIC COFFEE", itemSold: 1, itemRefunded: 0, grossSales: 20000, discounts: 0 },
  { name: "Lychee Tea - Ice", category: "ICED TEA", itemSold: 1, itemRefunded: 0, grossSales: 18000, discounts: 0 },
  { name: "Mix Platter", category: "SNACK", itemSold: 2, itemRefunded: 0, grossSales: 50000, discounts: 0 },
  { name: "Pisang Goreng", category: "SNACK", itemSold: 1, itemRefunded: 0, grossSales: 15000, discounts: 0 },
  { name: "Triples Choco Frappe", category: "FRAPPE", itemSold: 2, itemRefunded: 0, grossSales: 48000, discounts: 0 },
];

const quantityData: SalesData[] = [
  { name: "Beef Teriyaki", category: "MAIN COURSE", aLaCarte: 1, bundle: 0, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Chicken Skin Salted Egg", category: "MAIN COURSE", aLaCarte: 0, bundle: 1, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Chicken Salted Egg + Classic Tea", category: "Bundle_Package", aLaCarte: 0, bundle: 1, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Chocolate - Ice", category: "REFRESHER", aLaCarte: 1, bundle: 0, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Classic Black Tea - Hot", category: "ICED TEA", aLaCarte: 0, bundle: 1, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Filter Coffee - Kerinci Lactic Nat...", category: "CLASSIC COFFEE", aLaCarte: 1, bundle: 0, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Lychee Tea - Ice", category: "ICED TEA", aLaCarte: 1, bundle: 0, refundedAlaCarte: 0, refundedBundle: 0 },
  { name: "Mix Platter", category: "SNACK", aLaCarte: 2, bundle: 0, refundedAlaCarte: 0, refundedBundle: 0 },
];

const ItemSales: React.FC = () => {
  const [activeTab, setActiveTab] = useState("income");

  const totalIncome = incomeData.reduce((acc, item) => acc + (item.grossSales || 0), 0);

  return (
    <div className="p-4">
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "income" && (
        <>
          <p className="mt-4 text-gray-700">
            **Income** adalah total pendapatan dari penjualan setiap item. Gross sales menunjukkan total pendapatan sebelum diskon dan refund.
          </p>
          <table className="w-full mt-4 border-collapse border">
            <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Item Sold</th>
              <th className="border p-2">Item Refunded</th>
              <th className="border p-2">Gross Sales</th>
              <th className="border p-2">Discounts</th>
            </tr>
          </thead>
          <tbody>
            {incomeData.map((item, index) => (
              <tr key={index} className="border">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.category}</td>
                <td className="p-2 border">{item.itemSold}</td>
                <td className="p-2 border">{item.itemRefunded}</td>
                <td className="p-2 border">Rp. {item.grossSales?.toLocaleString()}</td>
                <td className="p-2 border">Rp. {item.discounts?.toLocaleString()}</td>
              </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={2} className="p-2 border">Total</td>
                <td className="p-2 border">{incomeData.reduce((acc, item)=> acc + (item.itemSold || 0), 0.)}</td>
                <td className="p-2 border">{incomeData.reduce((acc, item)=> acc + (item.itemRefunded || 0), 0.)}</td>
                <td className="p-2 border">Rp. {totalIncome.toLocaleString()}</td>
                <td className="p-2 border">Rp. {incomeData.reduce((acc, item)=> acc + (item.discounts || 0) ,0.).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {activeTab === "quantity" && (
        <>
          <p className="mt-4 text-gray-700">
            **Quantity** menunjukkan jumlah item yang terjual dalam bentuk A la Carte atau Bundle.
          </p>
          <table className="w-full mt-4 border-collapse border">
            <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">A la Carte</th>
              <th className="border p-2">Bundle</th>
              <th className="border p-2">Refunded (A la Carte)</th>
              <th className="border p-2">Refunded (Bundle)</th>
            </tr>
          </thead>
          <tbody>
            {quantityData.map((item, index) => (
              <tr key={index} className="border">
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.category}</td>
                <td className="p-2 border">{item.aLaCarte}</td>
                <td className="p-2 border">{item.bundle}</td>
                <td className="p-2 border">{item.refundedAlaCarte}</td>
                <td className="p-2 border">{item.refundedBundle}</td>
              </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={2} className="p-2 border">Total</td>
                <td className="p-2 border">{quantityData.reduce((acc, item) => acc + (item.aLaCarte || 0), 0)}</td>
                <td className="p-2 border">{quantityData.reduce((acc, item) => acc + (item.bundle || 0), 0)}</td>
                <td className="p-2 border">{quantityData.reduce((acc, item) => acc + (item.refundedAlaCarte|| 0), 0)}</td>
                <td className="p-2 border">{quantityData.reduce((acc, item) => acc + (item.refundedBundle || 0), 0)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default ItemSales;
