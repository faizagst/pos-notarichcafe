"use client";
import { useEffect, useState } from "react";

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface MenuIngredient {
  id: number;
  amount: number;
  ingredient: Ingredient;
}

interface Menu {
  id: number;
  name: string;
  description: string;
  image: string;
  Status: string;
  price: number;
  hargaBakul: number;
  maxBeli: number;
  category: string;
  ingredients: MenuIngredient[];
  discounts: any[];
}

interface SemiFinishedIngredient {
  id: number;
  name: string;
  compositions: {
    rawIngredient: Ingredient;
    amount: number;
  }[];
}

export default function ManagerMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [semiFinishedIngredients, setSemiFinishedIngredients] = useState<SemiFinishedIngredient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState<Menu[]>([]);
  const [filteredSemiIngredients, setFilteredSemiIngredients] = useState<SemiFinishedIngredient[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "semi_ingredient">("menu");

  useEffect(() => {
    fetchMenus();
    fetchSemiFinishedIngredients();
  }, []);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/hitungCost");
      const data = await res.json();
      setMenus(data);
      setFilteredMenus(data);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemiFinishedIngredients = async () => {
    try {
      const res = await fetch("/api/recipeSemi");
      const data = await res.json();
      setSemiFinishedIngredients(data);
      setFilteredSemiIngredients(data);
    } catch (error) {
      console.error("Error fetching semi-finished ingredients:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "menu") {
      setFilteredMenus(
        menus.filter((menu) =>
          menu.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredSemiIngredients(
        semiFinishedIngredients.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, activeTab, menus, semiFinishedIngredients]);

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Daftar Recipes</h1>

      {/* Sub Navbar */}
      <div className="flex space-x-4 border-b pb-3 mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === "menu"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
            }`}
          onClick={() => setActiveTab("menu")}
        >
          Menu
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === "semi_ingredient"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
            }`}
          onClick={() => setActiveTab("semi_ingredient")}
        >
          Semi-Finished Ingredient
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex justify-end mb-6">
        <input
          type="text"
          placeholder="Cari..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-1/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabel Menu */}
      {activeTab === "menu" && (
        <>
          {loading ? (
            <p>Loading...</p>
          ) : filteredMenus.length === 0 ? (
            <p className="text-center text-gray-500">Data tidak ditemukan</p>
          ) : (
            <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Menu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Ingredient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredients
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMenus.map((menu) => (
                  <tr key={menu.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{menu.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{menu.ingredients.length}</td>
                    <td className="px-6 py-4">
                      {menu.ingredients.map((item) => item.ingredient.name).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Tabel Semi-Finished Ingredients */}
      {activeTab === "semi_ingredient" && (
        <>
          {filteredSemiIngredients.length === 0 ? (
            <p className="text-center text-gray-500">Data tidak ditemukan</p>
          ) : (
            <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Semi-Finished
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Raw Ingredient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raw Ingredients
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSemiIngredients.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4">{item.compositions.length}</td>
                    <td className="px-6 py-4">
                      {item.compositions
                        .map(
                          (comp) =>
                            `${comp.rawIngredient.name} (${comp.amount} ${comp.rawIngredient.unit})`
                        )
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
