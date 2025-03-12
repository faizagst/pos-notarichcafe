import React from "react";

interface TaxData {
  name: string;
  taxRate: string;
  taxableAmount: number;
  taxCollected: number;
}

const taxData: TaxData[] = [
  { name: "PB", taxRate: "10%", taxableAmount: 1257660, taxCollected: 125766 },
];

const TaxesPage: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Tax Rate</th>
            <th className="px-4 py-2 border">Taxable Amount</th>
            <th className="px-4 py-2 border">Tax Collected</th>
          </tr>
        </thead>
        <tbody>
          {taxData.map((tax, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{tax.name}</td>
              <td className="px-4 py-2 border">{tax.taxRate}</td>
              <td className="px-4 py-2 border">Rp. {tax.taxableAmount.toLocaleString()}</td>
              <td className="px-4 py-2 border">Rp. {tax.taxCollected.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border"></td>
            <td className="px-4 py-2 border"></td>
            <td className="px-4 py-2 border">Rp. {taxData.reduce((acc, curr) => acc + curr.taxCollected, 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TaxesPage;
