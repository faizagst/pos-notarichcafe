import React, { ReactNode } from "react";
import SalesSidebar from "@/components/SalesSidebar";
import { Button } from "@/components/ui/button";

type SalesLayoutProps = {
  children: ReactNode;
};

const SalesLayout = ({ children }: SalesLayoutProps) => {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-white px-10 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-4xl font-semibold">Sales</h1>
        <Button className="bg-blue-500 text-white">Export</Button>
      </header>

      {/* Toolbar bawah header */}
      <div className="flex items-center px-6 py-1 bg-white mt-2">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-2 border rounded bg-gray-100">🏠 Notarich Cafe</span>
          <input type="date" className="border p-2 rounded text-gray-700" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
      </div>

      {/* Layout dua kolom dengan scroll terpisah */}
      <div className="grid grid-cols-12 gap-4 p-2 flex-1 overflow-hidden">
        {/* Sidebar dengan scroll sendiri */}
        <aside className="col-span-3 bg-white p-2 rounded-lg overflow-y-auto h-full">
          <SalesSidebar />
        </aside>

        {/* Konten dinamis dengan scroll sendiri */}
        <main className="col-span-9 bg-white p-2 rounded-lg overflow-y-auto h-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SalesLayout;