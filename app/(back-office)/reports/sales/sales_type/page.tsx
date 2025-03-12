'use client';

import React, { useState } from 'react';

interface SalesData {
  type: string;
  count: number;
  total: number;
}

const initialSalesData: SalesData[] = [
  { type: 'Dine in', count: 3, total: 371524 },
  { type: 'Takeaway', count: 2, total: 250000 },
  { type: 'Delivery', count: 5, total: 225000 },
];

const SalesType: React.FC = () => {
  const [sortedSales, setSortedSales] = useState(initialSalesData);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesData | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });

  const sortBy = (key: keyof SalesData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sorted = [...sortedSales].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSortedSales(sorted);
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof SalesData) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '▲' : '▼';
    }
    return null;
  };

  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left mt-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border cursor-pointer" onClick={() => sortBy('type')}>
              Sales Type {getSortIndicator('type') && <span>{getSortIndicator('type')}</span>}
            </th>
            <th className="px-4 py-2 border cursor-pointer" onClick={() => sortBy('count')}>
              Count {getSortIndicator('count') && <span>{getSortIndicator('count')}</span>}
            </th>
            <th className="px-4 py-2 border cursor-pointer" onClick={() => sortBy('total')}>
              Total Collected {getSortIndicator('total') && <span>{getSortIndicator('total')}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSales.map((item, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{item.type}</td>
              <td className="px-4 py-2 border">{item.count}</td>
              <td className="px-4 py-2 border">Rp. {item.total.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="bg-gray-300 font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border">{initialSalesData.reduce((acc, curr) => acc + curr.count, 0)}</td>
            <td className="px-4 py-2 border">Rp. {initialSalesData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SalesType;
