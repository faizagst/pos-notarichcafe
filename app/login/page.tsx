"use client";

import { useState, FormEvent } from "react";
import { LucideEye, LucideEyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<{
    backofficePermissions: Record<string, any>;
    appPermissions: Record<string, boolean>;
  } | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Ini penting agar cookie HttpOnly dikirim
      });

      const data = await res.json();

      if (res.ok) {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const userPermissions = {
            backofficePermissions: data.user?.backofficePermissions || {},
            appPermissions: data.user?.appPermissions || {},
          };
          const permissionRedirectMap: { permissionPath: string; redirectPath: string }[] = [

            // 💵 Dashboard
            { permissionPath: 'backofficePermissions.viewDashboard', redirectPath: '/dashboard' },

            // 📊 Reports
            { permissionPath: 'backofficePermissions.viewReports.sales', redirectPath: '/reports/sales/summary' },
            { permissionPath: 'backofficePermissions.viewReports.transactions', redirectPath: '/reports/transactions' },

            // 📦 Inventory
            { permissionPath: 'backofficePermissions.viewInventory.summary', redirectPath: '/inventory/summary' },
            { permissionPath: 'backofficePermissions.viewInventory.supplier', redirectPath: '/inventory/supplier' },
            { permissionPath: 'backofficePermissions.viewInventory.purchaseOrder', redirectPath: '/inventory/purchaseOrder' },

            // 🧾 Library
            { permissionPath: 'backofficePermissions.viewLibrary.bundlePackage', redirectPath: '/library/bundle_package' },
            { permissionPath: 'backofficePermissions.viewLibrary.discounts', redirectPath: '/library/discounts' },
            { permissionPath: 'backofficePermissions.viewLibrary.taxes', redirectPath: '/library/taxes' },
            { permissionPath: 'backofficePermissions.viewLibrary.gratuity', redirectPath: '/library/gratuity' },

            // 🧂 Modifiers
            { permissionPath: 'backofficePermissions.viewModifier.modifiersLibrary', redirectPath: '/modifiers/modifiersLibrary' },
            { permissionPath: 'backofficePermissions.viewModifier.modifierCategory', redirectPath: '/modifiers/modifierCategory' },

            // 🍳 Ingredients
            { permissionPath: 'backofficePermissions.viewIngredients.ingredientsLibrary', redirectPath: '/ingredients/ingredientsLibrary' },
            { permissionPath: 'backofficePermissions.viewIngredients.ingredientsCategory', redirectPath: '/ingredients/ingredientCategory' },
            { permissionPath: 'backofficePermissions.viewIngredients.recipes', redirectPath: '/ingredients/recipes' },

            // 🍽 Menu
            { permissionPath: 'backofficePermissions.viewMenu.menuList', redirectPath: '/menuNotarich/menuList' },
            { permissionPath: 'backofficePermissions.viewMenu.menuCategory', redirectPath: '/menuNotarich/menuCategory' },

            // 🧑‍💼 Recap
            { permissionPath: 'backofficePermissions.viewRecap.stockCafe', redirectPath: '/recapNotarich/stockCafe' },
            { permissionPath: 'backofficePermissions.viewRecap.stockInventory', redirectPath: '/recapNotarich/stockInventory' },

            // 👑 Employee
            { permissionPath: 'backofficePermissions.viewEmployees.employeeSlots', redirectPath: '/employee/employee_slots' },
            { permissionPath: 'backofficePermissions.viewEmployees.employeeAccess', redirectPath: '/employee/employee_access' },

            // 🧑‍🍳 Kasir (App/Cashier)
            { permissionPath: 'appPermissions.cashier', redirectPath: '/cashier' },
            { permissionPath: 'appPermissions.menu', redirectPath: '/cashier/menu' },
            { permissionPath: 'appPermissions.riwayat', redirectPath: '/cashier/riwayat' },
          ];


          let redirectPath = '/unauthorized';
          for (const item of permissionRedirectMap) {
            const keys = item.permissionPath.split('.');
            let value: any = userPermissions;

            for (const key of keys) {
              if (!value) break;
              value = value[key];
            }

            if (value === true) {
              redirectPath = item.redirectPath;
              break;
            }
          }

          router.push(redirectPath);
        } else {
          setErrorMessage(data.message || "Login failed");
        }
      } else {
        console.error('Failed to fetch permissions');
      }

    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("An error occurred while logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/login2.png')" }}
    >
      <div className="relative w-full max-w-md p-6 bg-white bg-opacity-80 rounded-lg shadow-lg md:max-w-lg lg:max-w-xl">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          ✕
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Log In</h2>
        {errorMessage && (
          <p className="text-center text-red-500 mb-4">{errorMessage}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mt-1 p-2 border rounded-lg focus:ring focus:ring-blue-200 bg-white text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute top-9 right-2 text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <LucideEyeOff /> : <LucideEye />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="my-4 text-center text-gray-500">OR</div>
        <button className="text-black w-full flex items-center justify-center p-2 border rounded-lg hover:bg-gray-200 transition">
          <FcGoogle className="text-xl mr-2" /> Log In with Google
        </button>
      </div>
    </div>
  );
}
