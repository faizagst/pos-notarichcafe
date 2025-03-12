'use client'
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CategoryData {
  category: string;
  itemsSold: number;
  itemsRefunded: number;
  grossSales: number;
  discounts: number;
  refund: number;
  netSales: number;
  COGS: number;
}

const CategorySalesPage = () => {
  const initialData: CategoryData[] = [
    { category: "Bundle_Package", itemsSold: 1, itemsRefunded: 0, grossSales: 36000, discounts: 0, refund: 0, netSales: 36000, COGS: 1160 },
    { category: "CLASSIC COFFEE", itemsSold: 1, itemsRefunded: 0, grossSales: 20000, discounts: 0, refund: 0, netSales: 20000, COGS: 0 },
    { category: "FRAPPE", itemsSold: 2, itemsRefunded: 0, grossSales: 48000, discounts: 0, refund: 0, netSales: 48000, COGS: 19500 },
    { category: "ICED TEA", itemsSold: 1, itemsRefunded: 0, grossSales: 18000, discounts: 0, refund: 0, netSales: 18000, COGS: 6305 },
    { category: "MAIN COURSE", itemsSold: 1, itemsRefunded: 0, grossSales: 33000, discounts: 0, refund: 0, netSales: 33000, COGS: 19268 },
    { category: "REFRESHER", itemsSold: 1, itemsRefunded: 0, grossSales: 22000, discounts: 0, refund: 0, netSales: 22000, COGS: 6965 },
    { category: "SNACK", itemsSold: 3, itemsRefunded: 0, grossSales: 65000, discounts: 0, refund: 0, netSales: 65000, COGS: 33960 }
  ];

  const [data, setData] = useState<CategoryData[]>(initialData);
  const [showCard, setShowCard] = useState(true);
  const totalGrossSales = data.reduce((acc, item) => acc + item.grossSales, 0);
  const totalCOGS = data.reduce((acc, item) => acc + item.COGS, 0);
  const totalGrossProfit = totalGrossSales - totalCOGS;

  const handleCloseCard = () => {
    setShowCard(false);
  };

  return (
    <div className="p-4">
      {showCard && (
        <Card className="mb-4 p-2 border-t-4 border-blue-500 relative">
          <CardContent>
            <h2 className="text-lg font-semibold">Gross Profit</h2>
            <p className="text-sm">To report gross profit accurately per category, please make sure all items have a COGS.</p>
            <button className="absolute top-1 right-1 text-gray-500" onClick={handleCloseCard}>✖</button>
          </CardContent>
        </Card>
      )}
      <div className="w-full overflow-x-auto">
        <table className="min-w-max border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Items Sold</th>
              <th className="p-2 border">Items Refunded</th>
              <th className="p-2 border">Gross Sales</th>
              <th className="p-2 border">Discounts</th>
              <th className="p-2 border">Refund</th>
              <th className="p-2 border">Net Sales</th>
              <th className="p-2 border">COGS</th>
              <th className="p-2 border">Gross Profit</th>
              <th className="p-2 border">Gross Margin</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const grossProfit = item.netSales - item.COGS;
              const grossMargin = ((grossProfit / item.grossSales) * 100).toFixed(0);
              return (
                <tr key={index} className="even:bg-gray-50">
                  <td className="p-2 border">{item.category}</td>
                  <td className="p-2 border">{item.itemsSold}</td>
                  <td className="p-2 border">{item.itemsRefunded}</td>
                  <td className="p-2 border">Rp {item.grossSales.toLocaleString()}</td>
                  <td className="p-2 border">Rp {item.discounts.toLocaleString()}</td>
                  <td className="p-2 border">Rp {item.refund.toLocaleString()}</td>
                  <td className="p-2 border">Rp {item.netSales.toLocaleString()}</td>
                  <td className="p-2 border">(Rp {item.COGS.toLocaleString()})</td>
                  <td className="p-2 border">Rp {grossProfit.toLocaleString()}</td>
                  <td className="p-2 border">{grossMargin}%</td>
                </tr>
              );
            })}
            <tr className="bg-gray-200 font-semibold">
              <td className="p-2 border">Total</td>
              <td className="p-2 border">{data.reduce((acc, item) => acc + item.itemsSold, 0)}</td>
              <td className="p-2 border">{data.reduce((acc, item) => acc + item.itemsRefunded, 0)}</td>
              <td className="p-2 border">Rp {totalGrossSales.toLocaleString()}</td>
              <td className="p-2 border">Rp {data.reduce((acc, item) => acc + item.discounts, 0).toLocaleString()}</td>
              <td className="p-2 border">Rp {data.reduce((acc, item) => acc + item.refund, 0).toLocaleString()}</td>
              <td className="p-2 border">Rp {totalGrossSales.toLocaleString()}</td>
              <td className="p-2 border">(Rp {totalCOGS.toLocaleString()})</td>
              <td className="p-2 border">Rp {totalGrossProfit.toLocaleString()}</td>
              <td className="p-2 border">
                {((totalGrossProfit / totalGrossSales) * 100).toFixed(0)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategorySalesPage;
