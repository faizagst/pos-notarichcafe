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
  LayoutDashboard,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  onToggle: (open: boolean) => void;
  isCollapsed: boolean;
  role: {
    appPermissions: Record<string, boolean>;
    backofficePermissions: Record<string, any>;
  };
}

const appRoutes: Record<string, string> = {
  '/cashier': 'appPermissions.cashier',
  '/cashier/menu': 'appPermissions.menu',
  '/cashier/riwayat': 'appPermissions.riwayat',
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, role }) => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("");
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);

  const hasPermission = (obj: any, path: string): boolean => {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current?.[key] === undefined) {
        console.log(`Permission check failed for path: ${path}`);
        return false;
      }
      current = current[key];
    }
    return current === true;
  };
  const getValueFromPath = (obj: any, path: string): any => {
    return path.split(".").reduce((o, p) => (o?.[p] !== undefined ? o[p] : null), obj);
  };
  const hasAnyAppPermission = () => {
    return Object.values(appRoutes).some((permPath) =>
      getValueFromPath(role, permPath)
    );
  };
  const getFirstAppLink = () => {
    for (const [route, permPath] of Object.entries(appRoutes)) {
      if (getValueFromPath(role, permPath)) {
        return route;
      }
    }
    return null;
  };


  const toggleSidebar = () => onToggle(!isCollapsed);

  const toggleCollapsible = (name: string) => {
    if (isCollapsed) {
      onToggle(false); // open the sidebar
      setTimeout(() => {
        setOpenCollapsible(name);
      }, 100);
    } else {
      setOpenCollapsible((prev) => (prev === name ? null : name));
    }
  };
  

  const handleClick = (name: string, link: string) => {
    if (isCollapsed) {
      onToggle(false); // open the sidebar
      setTimeout(() => {
        setActiveItem(name);
        router.push(link);
      }, 100); // slight delay to let sidebar open visually
    } else {
      setActiveItem(name);
      router.push(link);
    }
  };
  

  const menuItems = [
    {
      name: "Dashboard",
      link: "/dashboard",
      icon: <Home />,
      permissionPath: "backofficePermissions.viewDashboard",
    },
    {
      name: "Reports",
      icon: <FileText />,
      subItems: [
        {
          name: "Sales",
          link: "/reports/sales/summary",
          permissionPath: "backofficePermissions.viewReports.sales",
        },
        {
          name: "Transactions",
          link: "/reports/transactions",
          permissionPath: "backofficePermissions.viewReports.transactions",
        },
      ],
    },
    {
      name: "Inventory",
      icon: <Box />,
      subItems: [
        {
          name: "Summary",
          link: "/inventory/summary",
          permissionPath: "backofficePermissions.viewInventory.summary",
        },
        {
          name: "Supplier",
          link: "/inventory/supplier",
          permissionPath: "backofficePermissions.viewInventory.supplier",
        },
        {
          name: "Purchase Order (PO)",
          link: "/inventory/purchaseOrder",
          permissionPath: "backofficePermissions.viewInventory.purchaseOrder",
        },
      ],
    },
    {
      name: "Library",
      icon: <Book />,
      subItems: [
        {
          name: "Bundle Package",
          link: "/library/bundle_package",
          permissionPath: "backofficePermissions.viewLibrary.bundlePackage",
        },
        {
          name: "Discounts",
          link: "/library/discounts",
          permissionPath: "backofficePermissions.viewLibrary.discounts",
        },
        {
          name: "Taxes",
          link: "/library/taxes",
          permissionPath: "backofficePermissions.viewLibrary.taxes",
        },
        {
          name: "Gratuity",
          link: "/library/gratuity",
          permissionPath: "backofficePermissions.viewLibrary.gratuity",
        },
      ],
    },
    {
      name: "Modifiers",
      icon: <CreditCard />,
      subItems: [
        {
          name: "Modifiers Library",
          link: "/modifiers/modifiersLibrary",
          permissionPath: "backofficePermissions.viewModifier.modifiersLibrary",
        },
        {
          name: "Modifier Category",
          link: "/modifiers/modifierCategory",
          permissionPath: "backofficePermissions.viewModifier.modifierCategory",
        },
      ],
    },
    {
      name: "Ingredients",
      icon: <Coffee />,
      subItems: [
        {
          name: "Ingredients Library",
          link: "/ingredients/ingredientsLibrary",
          permissionPath:
            "backofficePermissions.viewIngredients.ingredientsLibrary",
        },
        {
          name: "Ingredients Category",
          link: "/ingredients/ingredientCategory",
          permissionPath:
            "backofficePermissions.viewIngredients.ingredientsCategory",
        },
        {
          name: "Recipes",
          link: "/ingredients/recipes",
          permissionPath: "backofficePermissions.viewIngredients.recipes",
        },
      ],
    },
    {
      name: "Menu Notarich",
      icon: <UtensilsCrossed />,
      subItems: [
        {
          name: "Menu List",
          link: "/menuNotarich/menuList",
          permissionPath: "backofficePermissions.viewMenu.menuList",
        },
        {
          name: "Menu Category",
          link: "/menuNotarich/menuCategory",
          permissionPath: "backofficePermissions.viewMenu.menuCategory",
        },
      ],
    },
    {
      name: "Recap Notarich",
      icon: <PencilLine />,
      subItems: [
        {
          name: "Stock Cafe",
          link: "/recapNotarich/stockCafe",
          permissionPath: "backofficePermissions.viewRecap.stockCafe",
        },
        {
          name: "Stock Inventory",
          link: "/recapNotarich/stockInventory",
          permissionPath: "backofficePermissions.viewRecap.stockInventory",
        },
      ],
    },
    {
      name: "Employee",
      icon: <Users />,
      subItems: [
        {
          name: "Employee Slots",
          link: "/employee/employee_slots",
          permissionPath: "backofficePermissions.viewEmployees.employeeSlots",
        },
        {
          name: "Employee Access",
          link: "/employee/employee_access",
          permissionPath: "backofficePermissions.viewEmployees.employeeAccess",
        },
      ],
    },
  ];

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-white border-r border-gray-300 shadow-lg z-50 transition-all duration-300 overflow-hidden flex flex-col
        ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Logo & Title */}
      <div className="bg-slate-800 py-6 px-5">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="Logo"
            className={`rounded-full ${isCollapsed ? "w-12 aspect-square mx-auto" : "w-12 h-12 mr-4"
              }`}
          />
          {!isCollapsed && (
            <span className="font-semibold text-white text-lg">
              Notarich Café
            </span>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-3 text-orange-300 text-sm font-medium tracking-wide transition-all duration-300">
            Backoffice Site
          </div>
        )}
        {isCollapsed && (
          <div className="text-center mt-2 text-[10px] text-orange-300 font-semibold tracking-tight">
            B Site
          </div>
        )}
      </div>


      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto overflow-hidden">
        <ul>
          {menuItems.map((item, index) => {
            const isGroup = !!item.subItems;
            const visibleSubItems = item.subItems?.filter((sub) =>
              hasPermission(role, sub.permissionPath)
            ) || [];


            if (isGroup && visibleSubItems.length === 0) return null;
            if (!isGroup && !hasPermission(role, item.permissionPath)) return null;

            return (
              <li key={index}>
                {isGroup ? (
                  <Collapsible open={openCollapsible === item.name}>
                    <CollapsibleTrigger asChild>
                      <div
                        className={`flex items-center px-4 py-2 cursor-pointer rounded-md ${openCollapsible === item.name ? "bg-orange-200" : ""
                          } hover:bg-orange-100`}
                        onClick={() => toggleCollapsible(item.name)}
                      >
                        <div className="mr-3">{item.icon}</div>
                        {!isCollapsed && item.name}
                        <ChevronRight
                          className={`ml-auto transition-transform duration-200 ${openCollapsible === item.name ? "rotate-90" : ""
                            }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent>
                        <ul className="pl-6 mt-1">
                          {visibleSubItems.map((subItem, subIndex) => (
                            <li
                              key={subIndex}
                              className={`px-3 py-2 cursor-pointer rounded-md ${activeItem === subItem.name
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
                    className={`flex items-center px-4 py-2 cursor-pointer rounded-md ${activeItem === item.name
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
            );
          })}
        </ul>
        {hasAnyAppPermission() && (
          <div className="pt-4 border-t mt-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    const route = getFirstAppLink();
                    if (route) handleClick("app", route);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-left ${
                    activeItem === "app"
                      ? "bg-orange-500 text-white"
                      : "hover:bg-orange-100"
                  }`}
                >
                  <span className="mr-3">
                    <LayoutDashboard />
                  </span>
                  {!isCollapsed && (
                    <span className="text-base font-medium">Go to Cashier Site</span>
                  )}
                </button>
              </li>
            </ul>
          </div>
          )}
      </nav>

      {/* Toggle Button */}
      <div className="bg-slate-800 p-4">
        <button
          onClick={toggleSidebar}
          className="text-white bg-slate-600 w-full py-2 rounded-full hover:bg-slate-700 flex justify-center items-center transition-transform duration-300"
        >
          <ChevronRight
            className={`transform transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""
              }`}
          />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
