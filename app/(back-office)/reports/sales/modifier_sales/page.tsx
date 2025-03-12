import React from "react";

interface ModifierSalesData {
  name: string;
  quantitySold: number;
  grossSales: number;
  discount: number;
  refund: number;
  netSales: number;
}

const modifierSalesData: ModifierSalesData[] = [
  { name: "Level Pedas", quantitySold: 6, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Pedes", quantitySold: 3, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Sedang", quantitySold: 3, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Saus", quantitySold: 2, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Blackpaper", quantitySold: 2, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Telur", quantitySold: 4, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Matang", quantitySold: 2, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
  { name: "Setengah Matang", quantitySold: 2, grossSales: 0, discount: 0, refund: 0, netSales: 0 },
];

const ModifierSalesPage: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Quantity Sold</th>
            <th className="px-4 py-2 border">Gross Sales</th>
            <th className="px-4 py-2 border">Discount</th>
            <th className="px-4 py-2 border">Refund</th>
            <th className="px-4 py-2 border">Net Sales</th>
          </tr>
        </thead>
        <tbody>
          {modifierSalesData.map((item, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{item.name}</td>
              <td className="px-4 py-2 border">{item.quantitySold}</td>
              <td className="px-4 py-2 border">Rp. {item.grossSales.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.discount.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.refund.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {item.netSales.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border">{modifierSalesData.reduce((acc, curr) => acc + curr.quantitySold, 0)}</td>
            <td className="px-4 py-2 border">Rp. {modifierSalesData.reduce((acc, curr) => acc + curr.grossSales, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {modifierSalesData.reduce((acc, curr) => acc + curr.discount, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {modifierSalesData.reduce((acc, curr) => acc + curr.refund, 0).toLocaleString()}</td>
            <td className="px-4 py-2 border">Rp. {modifierSalesData.reduce((acc, curr) => acc + curr.netSales, 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ModifierSalesPage;
