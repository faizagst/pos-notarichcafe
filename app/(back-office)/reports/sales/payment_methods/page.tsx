'use client';

import React from 'react';

interface PaymentData {
  method: string;
  transactions: number;
  total: string;
}

const paymentData: PaymentData[] = [
  { method: 'Cash', transactions: 1, total: 'Rp. 57.200' },
  { method: 'Other', transactions: 2, total: 'Rp. 214.300' },
];

const PaymentTable: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Payment Method</th>
            <th className="px-4 py-2 border">Number of Transactions</th>
            <th className="px-4 py-2 border">Total Collected</th>
          </tr>
        </thead>
        <tbody>
          {paymentData.map((item, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{item.method}</td>
              <td className="px-4 py-2 border">{item.transactions}</td>
              <td className="px-4 py-2 border">{item.total}</td>
            </tr>
          ))}
          <tr className="bg-gray-300 font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border">3</td>
            <td className="px-4 py-2 border">Rp. 271.500</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable;