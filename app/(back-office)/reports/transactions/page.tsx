'use client'
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TransactionTabs from "@/components/TabsTransactions";

const transactions = [
  { id: "1O4WWF", outlet: "Notarich Cafe", time: "14:01", cashier: "Kasir 1", items: "Air Mineral (Small)", total: "Rp. 9.000" },
  { id: "2A5XYZ", outlet: "Notarich Cafe", time: "16:12", cashier: "Kasir 1", items: "Chicken Wings, Red Velvet Latte (Hot), Strawberry Juice", total: "Rp. 65.100" },
];

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>
      
      <TransactionTabs />
      
      <div className="bg-white shadow-md p-4 mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <select className="border p-2 rounded">
            <option>All Outlet</option>
          </select>
          <input type="date" className="border p-2 rounded" />
          <input type="text" placeholder="Receipt Number" className="border p-2 rounded" />
        </div>
        <Button>Export</Button>
      </div>

      <Card className="p-4 mb-4 flex justify-between">
        <div>
          <h2 className="text-lg font-semibold">17</h2>
          <p className="text-sm text-gray-500">TRANSACTIONS</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Rp. 1.880.400</h2>
          <p className="text-sm text-gray-500">TOTAL COLLECTED</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Rp. 1.676.000</h2>
          <p className="text-sm text-gray-500">NET SALES</p>
        </div>
      </Card>

      <div className={`grid gap-4 ${selectedTransaction ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <div className={selectedTransaction ? "col-span-2" : "col-span-1"}>
          <table className="w-full border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2">Outlet</th>
                <th className="p-2">Time</th>
                <th className="p-2">Collected By</th>
                <th className="p-2">Items</th>
                <th className="p-2">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border hover:bg-gray-100 cursor-pointer" onClick={() => setSelectedTransaction(transaction)}>
                  <td className="p-2">{transaction.outlet}</td>
                  <td className="p-2">{transaction.time}</td>
                  <td className="p-2">{transaction.cashier}</td>
                  <td className="p-2">{transaction.items}</td>
                  <td className="p-2">{transaction.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedTransaction && (
          <div className="col-span-1 border p-4 bg-white overflow-y-auto max-h-[500px]">
            <h2 className="text-lg font-bold mb-2">ORDER DETAILS</h2>
            <p><strong>Status:</strong> Completed</p>
            <p><strong>Order ID:</strong> {selectedTransaction.id}</p>
            <p><strong>Receipt Number:</strong> {selectedTransaction.id}</p>
            <p><strong>Completed Time:</strong> 23 Feb 2025 {selectedTransaction.time}</p>
            <p><strong>Served by:</strong> {selectedTransaction.cashier}</p>
            <p><strong>Collected by:</strong> {selectedTransaction.cashier}</p>
            <p><strong>Total Amount:</strong> {selectedTransaction.total}</p>
            <p><strong>Payment Method:</strong> Cash</p>
            
            <h3 className="mt-4 text-md font-bold">ORDERED ITEMS</h3>
            <p>{selectedTransaction.items}</p>

            <h3 className="mt-4 text-md font-bold">VOIDED ITEMS</h3>
            <p className="text-gray-500">No Item Found</p>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => setSelectedTransaction(null)}>Close</Button>
              <Button variant="outline">Resend Receipt</Button>
              <Button variant="outline">Issue Refund</Button>
              <Button variant="outline">Show Receipt</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
