import React from "react";

const SalesPage: React.FC = () => {
  return (
    <div className="min-h-fit">
      <div className=" bg-white p-6 ">
        <h1 className="text-2xl font-bold text-gray-700">Sales Summary</h1>
        <table className="w-full mt-4 border-collapse border border-gray-200">
          <tbody>
            {[
              { label: "Gross Sales", value: "Rp. 902.000" },
              { label: "Discounts", value: "(Rp. 86.000)" },
              { label: "Refunds", value: "Rp. 0" },
              { label: "Net Sales", value: "Rp. 816.000" },
              { label: "Gratuity", value: "Rp. 16.320" },
              { label: "Tax", value: "Rp. 83.232" },
              { label: "Rounding", value: "(Rp. 52)" },
              { label: "Total Collected", value: "Rp. 916.500" },
            ].map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2 font-semibold">{item.label}</td>
                <td className="p-2 text-right">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesPage;
