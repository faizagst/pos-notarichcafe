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
  UtensilsCrossed,
  Users,
  ChevronRight,
  PencilLine,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  onToggle: (open: boolean) => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("");
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  

  const toggleSidebar = () => {
    onToggle(!isCollapsed);
  };

  const toggleCollapsible = (name: string) => {
    setOpenCollapsible((prev) => (prev === name ? null : name));
  };

  const menuItems = [
    { name: "Dashboard", link: "/dashboard", icon: <Home /> },
    {
      name: "Reports",
      icon: <FileText />,
      subItems: [
        { name: "Sales", link: "/reports/sales/summary" },
        { name: "Transactions", link: "/reports/transactions" },
      ],
    },
    {
      name: "Inventory",
      icon: <Box />,
      subItems: [
        { name: "Summary", link: "/inventory/summary" },
        { name: "Supplier", link: "/inventory/supplier" },
        { name: "Purchase Order (PO)", link: "/inventory/purchaseOrder" },
      ],
    },
    {
      name: "Library",
      icon: <Book />,
      subItems: [

        { name: "Bundle Package", link: "/library/bundle_package" },
        { name: "Discounts", link: "/library/discounts" },
        { name: "Taxes", link: "/library/taxes" },
        { name: "Gratuity", link: "/library/gratuity" },
      ],
    },
    {
      name: "Modifiers",
      icon: <CreditCard />,
      subItems: [
        { name: "Modifiers Library", link: "/modifiers/modifiersLibrary" },
        { name: "Modifier Category", link: "/modifiers/modifierCategory" },
      ],
    },
    {
      name: "Ingredients",
      icon: <Coffee />,
      subItems: [
        { name: "Ingredients Library", link: "/ingredients/ingredientsLibrary" },
        { name: "Ingredients Category", link: "/ingredients/ingredientCategory" },
        { name: "Recipes", link: "/ingredients/recipes" },
      ],
    },
    {
      name: "Menu Notarich",
      icon: <UtensilsCrossed/>,
      subItems: [
        { name: "Menu List", link: "/menuNotarich/menuList" },
        { name: "Menu Category", link: "/menuNotarich/menuCategory" },
      ],
    },
    {
      name: "Recap Notarich",
      icon: <PencilLine/>,
      subItems: [
        { name: "Stock Cafe", link: "/recapNotarich/stockCafe" },
        { name: "Stock Inventory", link: "/recapNotarich/stockInventory" },
      ],
    },
    {
      name: "Employee",
      icon: <Users />,
      subItems: [
        { name: "Employee Slots", link: "/employee/employee_slots" },
        { name: "Employee Access", link: "/employee/employee_access" },
      ],
    },
  ];

  const handleClick = (name: string, link: string) => {
    setActiveItem(name);
    router.push(link);
  };

  return (
    <div
    className={`fixed top-0 left-0 h-full bg-white border-r border-gray-300 shadow-lg z-50 transition-all duration-300 overflow-hidden flex flex-col
    ${isCollapsed ? "w-20" : "w-64"}`}>
      {/* Logo */}
      <div className="bg-slate-800 flex items-center py-6 px-5">
        <div className="flex items-center w-full">
          <img
            src="/logo.png"
            alt="Logo"
            className={`rounded-full ${
              isCollapsed ? "w-12 aspect-square" : "w-12 h-12 mr-4"
            }`}
          />
          {!isCollapsed && (
            <span className="font-semibold text-white text-lg">
              Notarich Café
            </span>
          )}
        </div>
      </div>

      {/* Links */}
      <nav className="flex-1 overflow-y-auto overflow-hidden">
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subItems ? (
                <Collapsible open={openCollapsible === item.name}>
                  <CollapsibleTrigger asChild>
                    <div
                      className={`flex items-center px-4 py-2 cursor-pointer rounded-md ${
                        openCollapsible === item.name ? "bg-orange-200" : ""
                      } hover:bg-orange-100`}
                      onClick={() => toggleCollapsible(item.name)}
                    >
                      <div className="mr-3">{item.icon}</div>
                      {!isCollapsed && item.name}
                      <ChevronRight
                        className={`ml-auto transition-transform duration-200 ${
                          openCollapsible === item.name ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  {!isCollapsed && (
                    <CollapsibleContent>
                      <ul className="pl-6 mt-1">
                        {item.subItems.map((subItem, subIndex) => (
                          <li
                            key={subIndex}
                            className={`px-3 py-2 cursor-pointer rounded-md ${
                              activeItem === subItem.name
                                ? "bg-orange-500 text-white"
                                : "hover:bg-orange-100"
                            }`}
                            onClick={() =>
                              handleClick(subItem.name, subItem.link)
                            }
                          >
                            {subItem.name}
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  )}
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
                  <div className="mr-3">{item.icon}</div>
                  {!isCollapsed && item.name}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className="bg-slate-800 p-4">
        <button
          onClick={toggleSidebar}
          className="text-white bg-slate-600 w-full py-2 rounded-full hover:bg-slate-700 flex justify-center items-center transition-transform duration-300"
        >
          <ChevronRight
            className={`transform transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
