"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Clock,
  AppWindow,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: (open: boolean) => void;
  role: {
    appPermissions: Record<string, boolean>;
    backofficePermissions: Record<string, any>;
  };
}

const backofficeRoutes: Record<string, string> = {
  "/dashboard": "backofficePermissions.viewDashboard",
  "/reports/sales/summary": "backofficePermissions.viewReports.sales",
  "/reports/transactions": "backofficePermissions.viewReports.transactions",
  "/inventory/summary": "backofficePermissions.viewInventory.summary",
  "/inventory/supplier": "backofficePermissions.viewInventory.supplier",
  "/inventory/purchaseOrder": "backofficePermissions.viewInventory.purchaseOrder",
  "/library/bundle_package": "backofficePermissions.viewLibrary.bundlePackage",
  "/library/discounts": "backofficePermissions.viewLibrary.discounts",
  "/library/taxes": "backofficePermissions.viewLibrary.taxes",
  "/library/gratuity": "backofficePermissions.viewLibrary.gratuity",
  "/modifiers/modifiersLibrary": "backofficePermissions.viewModifier.modifiersLibrary",
  "/modifiers/modifierCategory": "backofficePermissions.viewModifier.modifierCategory",
  "/ingredients/ingredientsLibrary": "backofficePermissions.viewIngredients.ingredientsLibrary",
  "/ingredients/ingredientCategory": "backofficePermissions.viewIngredients.ingredientsCategory",
  "/ingredients/recipes": "backofficePermissions.viewIngredients.recipes",
  "/menuNotarich/menuList": "backofficePermissions.viewMenu.menuList",
  "/menuNotarich/menuCategory": "backofficePermissions.viewMenu.menuCategory",
  "/recapNotarich/stockCafe": "backofficePermissions.viewRecap.stockCafe",
  "/recapNotarich/stockInventory": "backofficePermissions.viewRecap.stockInventory",
  "/recapNotarich/prediction": "backofficePermissions.viewRecap.prediction",
  "/employee/employee_slots": "backofficePermissions.viewEmployees.employeeSlots",
  "/employee/employee_access": "backofficePermissions.viewEmployees.employeeAccess",
};

const SidebarKasir: React.FC<SidebarProps> = ({ isCollapsed, onToggle, role }) => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("");

  const hasPermission = (path: string) => {
    return role.appPermissions?.[path] === true;
  };

  const hasAnyBackofficePermission = () => {
    return Object.values(backofficeRoutes).some((permPath) =>
      getValueFromPath(role, permPath)
    );
  };

  const getFirstBackofficeLink = () => {
    for (const [route, permPath] of Object.entries(backofficeRoutes)) {
      if (getValueFromPath(role, permPath)) {
        return route;
      }
    }
    return null;
  };

  const getValueFromPath = (obj: any, path: string): any => {
    return path.split(".").reduce((o, p) => (o?.[p] !== undefined ? o[p] : null), obj);
  };

  const menuItems = [
    {
      name: "Cashier",
      key: "cashier",
      icon: <LayoutDashboard />,
      link: "/cashier",
    },
    {
      name: "Menu",
      key: "menu",
      icon: <Monitor />,
      link: "/cashier/menu",
    },
    {
      name: "Riwayat Transaksi",
      key: "riwayat",
      icon: <Clock />,
      link: "/cashier/riwayat",
    },
  ];

  const handleClick = (key: string, link: string) => {
    if (isCollapsed) {
      onToggle(false);
      setTimeout(() => {
        setActiveItem(key);
        router.push(link);
      }, 100);
    } else {
      setActiveItem(key);
      router.push(link);
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-white border-r border-gray-300 shadow-lg z-50 transition-all duration-300 flex flex-col overflow-hidden ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo & Title */}
      <div className="bg-slate-800 py-6 px-5">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="Logo"
            className={`rounded-full ${
              isCollapsed ? "w-12 aspect-square mx-auto" : "w-12 h-12 mr-4"
            }`}
          />
          {!isCollapsed && (
            <span className="font-semibold text-white text-lg">Notarich Café</span>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-3 text-orange-300 text-sm font-medium tracking-wide transition-all duration-300">
            Cashier Site
          </div>
        )}
        {isCollapsed && (
          <div className="text-center mt-2 text-[10px] text-orange-300 font-semibold tracking-tight">
            C Site
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuItems
            .filter((item) => hasPermission(item.key))
            .map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => handleClick(item.key, item.link)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-left ${
                    activeItem === item.key
                      ? "bg-orange-500 text-white"
                      : "hover:bg-orange-100"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-base font-medium">{item.name}</span>
                  )}
                </button>
              </li>
            ))}
        </ul>

        {hasAnyBackofficePermission() && (
          <div className="pt-4 border-t mt-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    const route = getFirstBackofficeLink();
                    if (route) handleClick("backoffice", route);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-left ${
                    activeItem === "backoffice"
                      ? "bg-orange-500 text-white"
                      : "hover:bg-orange-100"
                  }`}
                >
                  <span className="mr-3">
                    <AppWindow />
                  </span>
                  {!isCollapsed && (
                    <span className="text-base font-medium">Go to Backoffice Site</span>
                  )}
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Toggle Button */}
      <div className="bg-slate-800 p-4">
        <Button
          onClick={() => onToggle(!isCollapsed)}
          className="w-full text-white bg-slate-600 hover:bg-slate-700 rounded-full"
        >
          <ChevronRight
            className={`transition-transform ${isCollapsed ? "rotate-180" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
};

export default SidebarKasir;
