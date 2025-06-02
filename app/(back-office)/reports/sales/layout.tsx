"use client";
import { ReactNode, useState } from "react";
import SidebarSales from "@/components/SalesSidebar";

interface SalesLayoutProps {
  children: ReactNode;
}

const SalesLayout: React.FC<SalesLayoutProps> = ({ children }) => {

  return (
    <div
      className="min-h-screen"
    >
      {/* Global Sidebar */}
      <div className="flex">
        {/* Sidebar Sales */}
        <div className="min-w-64">
          <SidebarSales />
        </div>
        {/* Area Konten untuk Report Sales */}
        <div className="flex-1 p-4 bg-white ">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SalesLayout;
