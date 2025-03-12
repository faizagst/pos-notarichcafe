import React from "react";

interface BrandSalesData {
  brand: string;
  itemsSold: number;
  itemsRefunded: number;
  grossSales: number;
  discount: number;
  refund: number;
  netSales: number;
  gratuityCollected: number;
  taxCollected: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
}

const brandSalesData: BrandSalesData[] = [
  { brand: "Unbranded", itemsSold: 12, itemsRefunded: 0, grossSales: 314000, discount: 0, refund: 0, netSales: 314000, gratuityCollected: 6280, taxCollected: 32028, cogs: -88318, grossProfit: 225682, grossMargin: 72 },
  { brand: "Beef Teriyaki", itemsSold: 1, itemsRefunded: 0, grossSales: 33000, discount: 0, refund: 0, netSales: 33000, gratuityCollected: 660, taxCollected: 3366, cogs: -19268, grossProfit: 13732, grossMargin: 42 },
  { brand: "Chicken Salted Egg + Classic", itemsSold: 1, itemsRefunded: 0, grossSales: 36000, discount: 0, refund: 0, netSales: 36000, gratuityCollected: 720, taxCollected: 3672, cogs: -1160, grossProfit: 34840, grossMargin: 97 },
  { brand: "Chocolate - Ice", itemsSold: 1, itemsRefunded: 0, grossSales: 22000, discount: 0, refund: 0, netSales: 22000, gratuityCollected: 440, taxCollected: 2244, cogs: -6965, grossProfit: 15035, grossMargin: 68 },
  { brand: "Mix Platter", itemsSold: 2, itemsRefunded: 0, grossSales: 50000, discount: 0, refund: 0, netSales: 50000, gratuityCollected: 1000, taxCollected: 5100, cogs: -24510, grossProfit: 25490, grossMargin: 51 },
];

const BrandSalesPage: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Brand</th>
            <th className="px-4 py-2 border">Items Sold</th>
            <th className="px-4 py-2 border">Items Refunded</th>
            <th className="px-4 py-2 border">Gross Sales</th>
            <th className="px-4 py-2 border">Discount</th>
            <th className="px-4 py-2 border">Refund</th>
            <th className="px-4 py-2 border">Net Sales</th>
            <th className="px-4 py-2 border">Gratuity Collected</th>
            <th className="px-4 py-2 border">Tax Collected</th>
            <th className="px-4 py-2 border">COGS</th>
            <th className="px-4 py-2 border">Gross Profit</th>
            <th className="px-4 py-2 border">Gross Margin</th>
          </tr>
        </thead>
        <tbody>
          {brandSalesData.map((item, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{item.brand}</td>
              <td className="px-4 py-2 border">{item.itemsSold}</td>
              <td className="px-4 py-2 border">{item.itemsRefunded}</td>
              <td className="px-4 py-2 border">Rp. {item.grossSales.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.discount.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.refund.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.netSales.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.gratuityCollected.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.taxCollected.toLocaleString()}</td>
              <td className="px-4 py-2 border">(Rp. {Math.abs(item.cogs).toLocaleString()})</td>
              <td className="px-4 py-2 border">Rp. {item.grossProfit.toLocaleString()}</td>
              <td className="px-4 py-2 border">{item.grossMargin}%</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border">{brandSalesData.reduce((acc, curr) => acc + curr.itemsSold, 0)}</td>
            <td className="px-4 py-2 border">{brandSalesData.reduce((acc, curr) => acc + curr.itemsRefunded, 0)}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.grossSales, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.discount, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.refund, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.netSales, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.gratuityCollected, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.taxCollected, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">(Rp. {Math.abs(brandSalesData.reduce((acc, curr) => acc + curr.cogs, 0)).toLocaleString()})</td>
            <td className="px-4 py-2 border">Rp. {brandSalesData.reduce((acc, curr) => acc + curr.grossProfit, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">72%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BrandSalesPage;
