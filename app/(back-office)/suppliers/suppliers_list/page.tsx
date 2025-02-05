import React from "react";

const SuppliersPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <div className="bg-white p-6">
        <div className="flex justify-between items-center mt-4">
          <input
            type="text"
            placeholder="Search"
            className="border p-2 rounded w-1/3"
          />
        </div>
        
        <table className="w-full mt-4 border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Address</th>
              <th className="p-2 border">Phone</th>
              <th className="p-2 border">Email</th>
            </tr>
          </thead>
          <tbody>
            {[ 
              { name: "Astery (Arif)", address: "Solo", phone: "85740661150", email: "notarichcoffee@gmail.com" },
              { name: "Cake (Novi)", address: "Kudus", phone: "8122877403", email: "novi@gmail.com" },
              { name: "Indomilk (Nia)", address: "Kudus", phone: "85878252662", email: "-@gmail.com" },
              { name: "Otten Coffee (Reza)", address: "Semarang", phone: "8112611995", email: "rezadn.ottensemarang@gmail.com" },
            ].map((supplier, index) => (
              <tr key={index} className="border-b">
                <td className="p-2 border">{supplier.name}</td>
                <td className="p-2 border">{supplier.address}</td>
                <td className="p-2 border">{supplier.phone}</td>
                <td className="p-2 border">{supplier.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliersPage;