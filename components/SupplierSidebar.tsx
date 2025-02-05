"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Suppliers List", path: "/suppliers/suppliers_list" },
  { name: "Purchase Order", path: "/suppliers/purchase_order" }
];

const SupplierSidebar = () => {
  const pathname = usePathname();

  return (
    <div className="w-full bg-white h-full p-4 ">
      <ul className="space-y-1">
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

export default SupplierSidebar;
