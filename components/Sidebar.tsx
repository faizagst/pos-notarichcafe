"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  FileText,
  Box,
  Book,
  Coffee,
  CreditCard,
  Truck,
  Users,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Sidebar = () => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("");
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  const toggleCollapsible = (name: string) => {
    setOpenCollapsible((prev) => (prev === name ? null : name));
  };

  const menuItems = [
    { name: "Dashboard", link: "/dashboard", icon: <Home className="mr-3" /> },
    {
      name: "Reports",
      icon: <FileText className="mr-3" />,
      subItems: [
        { name: "Sales", link: "#" },
        { name: "Transactions", link: "#" },
        { name: "Invoices", link: "#" },
        { name: "Shift", link: "#" },
      ],
    },
    {
      name: "Inventory",
      icon: <Box className="mr-3" />,
      subItems: [
        { name: "Summary", link: "#" },
        { name: "Transfer", link: "#" },
        { name: "Adjustment", link: "#" },
      ],
    },
    {
      name: "Library",
      icon: <Book className="mr-3" />,
      subItems: [
        { name: "Item Library", link: "#" },
        { name: "Modifiers", link: "#" },
        { name: "Categories", link: "#" },
        { name: "Bundle Package", link: "#" },
        { name: "Promo", link: "#" },
        { name: "Discounts", link: "#" },
        { name: "Taxes", link: "#" },
        { name: "Gratuity", link: "#" },
        { name: "Sales Type", link: "#" },
      ],
    },
    {
      name: "Ingredients",
      icon: <Coffee className="mr-3" />,
      subItems: [
        { name: "Ingredients Library", link: "#" },
        { name: "Ingredients Categories", link: "#" },
        { name: "Recipes", link: "#" },
      ],
    },
    {
      name: "Payment",
      icon: <CreditCard className="mr-3" />,
      subItems: [
        { name: "Invoices", link: "#" },
        { name: "Transactions", link: "#" },
      ],
    },
    {
      name: "Suppliers",
      icon: <Truck className="mr-3" />,
      subItems: [
        { name: "Suppliers List", link: "#" },
        { name: "Purchase Order", link: "#" },
      ],
    },
    {
      name: "Employee",
      icon: <Users className="mr-3" />,
      subItems: [
        { name: "Employee List", link: "#" },
        { name: "Employee Access", link: "#" },
      ],
    },
  ];

  const handleClick = (name: string, link: string) => {
    setActiveItem(name);
    router.push(link);
  };

  return (
    <div className="w-64 h-screen bg-white text-black overflow-hidden border-r border-gray-200 shadow-lg">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="bg-slate-800 flex items-center py-6 px-5">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-12 h-12 rounded-full mr-4"
          />
          <span className="font-semibold text-white text-lg">
            Notarich Café
          </span>
        </div>
        {/* Links */}
        <nav className="flex-1 overflow-y-auto">
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                {item.subItems ? (
                  <Collapsible open={openCollapsible === item.name}>
                    <CollapsibleTrigger asChild>
                      <div
                        className={`flex items-center px-4 py-2 cursor-pointer rounded-md ${
                          openCollapsible === item.name
                            ? "bg-orange-200 "
                            : ""
                        } hover:bg-orange-100`}
                        onClick={() => toggleCollapsible(item.name)}
                      >
                        {item.icon} {item.name}
                        <ChevronRight
                          className={`ml-auto transition-transform duration-200 ${
                            openCollapsible === item.name ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="pl-8 mt-1">
                        {item.subItems.map((subItem, subIndex) => (
                          <li
                            key={subIndex}
                            className={`px-3 py-2 cursor-pointer rounded-md ${
                              activeItem === subItem.name
                                ? "bg-orange-500 text-white"
                                : "hover:bg-orange-100"
                            }`}
                            onClick={() => handleClick(subItem.name, subItem.link)}
                          >
                            {subItem.name}
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div
                    className={`flex items-center px-4 py-2 cursor-pointer rounded-md ${
                      activeItem === item.name
                        ? "bg-orange-500 text-white"
                        : "hover:bg-orange-100"
                    }`}
                    onClick={() => handleClick(item.name, item.link)}
                  >
                    {item.icon} {item.name}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
