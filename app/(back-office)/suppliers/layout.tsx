import React, { ReactNode } from "react";
import SupplierSidebar from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";

type SupplierLayoutProps = {
  children: ReactNode;
};

const SupplierLayout = ({ children }: SupplierLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white px-10 py-4 flex items-center justify-between border-b">
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <div className="flex space-x-2">
            <Button className="bg-blue-500 text-white px-4 py-2">Export</Button>
            <Button className="bg-blue-600 text-white px-4 py-2">Create Supplier</Button>
          </div>
        </header>

        {/* Toolbar bawah header */}
        <div className="flex items-center px-6 py-2 bg-white border-b">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-2 border rounded bg-gray-100 flex items-center">🏠 Notarich Cafe</span>
            <input type="date" className="border p-2 rounded text-gray-700" defaultValue="2025-01-30" />
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-white shadow-md rounded-lg">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SupplierLayout;
