import { useState } from 'react';

const GrossProfitPage = () => {
  const data = {
    grossSales: 1041800,
    discounts: 44000,
    refunds: 0,
    netSales: 997800,
    cogs: 408061,
    grossProfit: 589739
  };

  const percentage = (value: number, total: number) => ((value / total) * 100).toFixed(0);

  return (
    <div className="min-h-fit">
      <div className="bg-white p-6">
        <div className="border-b-2 pb-4 mb-4">
          <h2 className="text-2xl font-bold">Gross Profit</h2>
          <p className="text-gray-600 text-sm">
            Gross Profit is your Net Sales minus Cost of Goods Sold (COGS). To report gross profit accurately, please make sure all items have a COGS.
          </p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="py-2">Gross Sales</td>
              <td className="text-right">Rp. {data.grossSales.toLocaleString()}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Discounts</td>
              <td className="text-right">(Rp. {data.discounts.toLocaleString()})</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Refunds</td>
              <td className="text-right">Rp. {data.refunds.toLocaleString()}</td>
            </tr>
            <tr className="font-bold border-b">
              <td className="py-2">Net Sales</td>
              <td className="text-right flex justify-end items-center">
                Rp. {data.netSales.toLocaleString()} 
                <span className="ml-2 bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{percentage(data.netSales, data.netSales)}%</span>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Cost of Goods Sold (COGS)</td>
              <td className="text-right flex justify-end items-center">
                (Rp. {data.cogs.toLocaleString()}) 
                <span className="ml-2 bg-red-200 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{percentage(data.cogs, data.netSales)}%</span>
              </td>
            </tr>
            <tr className="font-bold">
              <td className="py-2">Gross Profit</td>
              <td className="text-right flex justify-end items-center">
                Rp. {data.grossProfit.toLocaleString()} 
                <span className="ml-2 bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{percentage(data.grossProfit, data.netSales)}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrossProfitPage;