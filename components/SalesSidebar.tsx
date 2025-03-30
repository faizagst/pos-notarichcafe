"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Sales Summary", path: "/reports/sales/summary" },
  { name: "Gross Profit", path: "/reports/sales/gross_profit" },
  { name: "Payment Methods", path: "/reports/sales/payment_methods" },
  { name: "Item Sales", path: "/reports/sales/item_sales" },
  { name: "Category Sales", path: "/reports/sales/category_sales" },
  { name: "Modifier Sales", path: "/reports/sales/modifier_sales" },
  { name: "Discounts", path: "/reports/sales/discounts" },
  { name: "Taxes", path: "/reports/sales/taxes" },
  { name: "Gratuity", path: "/reports/sales/gratuity" },
];

const SalesSidebar = () => {
  const pathname = usePathname(); // Mendapatkan path halaman aktif

  return (
    <div className="h-full bg-white ">
      <ul className="space-y-2 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <li key={item.path}>
              <Link href={item.path}>
                <span
                  className={`block px-4 py-2 rounded-md cursor-pointer transition
                    ${isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-100 hover:text-blue-600"}`}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SalesSidebar;
