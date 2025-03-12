import React from "react";

interface DiscountData {
  name: string;
  discountAmount: string;
  count: number;
  grossDiscount: number;
  netDiscount: number;
}

const discountData: DiscountData[] = [
  { name: "Disc Compliment (Influencer)", discountAmount: "100%", count: 2, grossDiscount: 48000, netDiscount: 48000 },
  { name: "Disc Owner", discountAmount: "100%", count: 1, grossDiscount: 22000, netDiscount: 22000 },
];

const DiscountsPage: React.FC = () => {
  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Discount Amount</th>
            <th className="px-4 py-2 border">Count</th>
            <th className="px-4 py-2 border">Gross Discount</th>
            <th className="px-4 py-2 border">Net Discount</th>
          </tr>
        </thead>
        <tbody>
          {discountData.map((discount, index) => (
            <tr key={index} className="border">
              <td className="px-4 py-2 border">{discount.name}</td>
              <td className="px-4 py-2 border">{discount.discountAmount}</td>
              <td className="px-4 py-2 border">{discount.count}</td>
              <td className="px-4 py-2 border">(Rp. {discount.grossDiscount.toLocaleString()})</td>
              <td className="px-4 py-2 border">(Rp. {discount.netDiscount.toLocaleString()})</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="px-4 py-2 border">Total</td>
            <td className="px-4 py-2 border"></td>
            <td className="px-4 py-2 border">{discountData.reduce((acc, curr) => acc + curr.count, 0)}</td>
            <td className="px-4 py-2 border">(Rp. {discountData.reduce((acc, curr) => acc + curr.grossDiscount, 0).toLocaleString()})</td>
            <td className="px-4 py-2 border">(Rp. {discountData.reduce((acc, curr) => acc + curr.netDiscount, 0).toLocaleString()})</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DiscountsPage;
