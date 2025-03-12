'use client';

import React from 'react';

interface CollectedByData {
  name: string;
  title: string;
  transactions: number;
  total: number;
}

const CollectedByData: CollectedByData[] = [
  { name: 'Moonstar',title:'kasir', transactions: 10, total: 957200 },
  { name: 'Katarina',title:'manajer', transactions: 3, total: 214300 },
];

const CollectByTable: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Title</th>
            <th className="px-4 py-2 border">Number of Transactions</th>
            <th className="px-4 py-2 border">Total Collected</th>
          </tr>
        </thead>
        <tbody>
          {CollectedByData.map((item, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{item.name}</td>
              <td className="px-4 py-2 border">{item.title}</td>
              <td className="px-4 py-2 border">{item.transactions}</td>
              <td className="px-4 py-2 border">Rp. {item.total.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border"></td>
            <td className="px-4 py-2 border">{CollectedByData.reduce((acc, curr)=> acc + curr.transactions,0)}</td>
            <td className="px-4 py-2 border">Rp. {CollectedByData.reduce((acc, curr)=> acc + curr.total,0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CollectByTable;
