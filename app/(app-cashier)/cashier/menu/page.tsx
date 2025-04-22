"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface DiscountInfo {
    discount: {
        id: number;
        name: string;
        type: string;
        scope: string;
        value: number;
        isActive: boolean;
    };
}

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

interface Modifier {
    modifier: {
        id: number;
        name: string;
    };
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
    discounts: DiscountInfo[];
    modifiers: Modifier[];
    isActive: boolean;
}

export default function ManagerMenusPage() {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredMenus, setFilteredMenus] = useState<Menu[]>([]);

    const fetchMenus = async () => {
        try {
            const res = await fetch("/api/hitungCost?type=NORMAL");
            const data = await res.json();
            setMenus(data);
            setFilteredMenus(data);
        } catch (error) {
            console.error("Error fetching menus:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenus();
    }, []);

    useEffect(() => {
        const filtered = menus.filter(
            (menu) =>
                menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (menu.description &&
                    menu.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setFilteredMenus(filtered);
    }, [searchQuery, menus]);

    const handleToggleIsActive = async (menuId: number, currentIsActive: boolean) => {
        const newIsActive = !currentIsActive;

        try {
            const res = await fetch(`/api/menu/getMenu/${menuId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ isActive: newIsActive }),
            });

            if (res.ok) {
                setMenus(menus.map(menu =>
                    menu.id === menuId ? { ...menu, isActive: newIsActive } : menu
                ));
                setFilteredMenus(filteredMenus.map(menu =>
                    menu.id === menuId ? { ...menu, isActive: newIsActive } : menu
                ));
            } else {
                toast.error("Gagal mengubah status menu.");
            }
        } catch (error) {
            console.error("Error updating isActive:", error);
            alert("Terjadi kesalahan saat mengubah status.");
        }
    };


    return (
        <div className="p-10 mt-[65px]">
            <h1 className="text-2xl font-bold mb-4">Daftar Menu</h1>
            <div className="mb-4 flex justify-end">
                <input
                    type="text"
                    placeholder="Search Category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-1/3 p-2 border border-gray-300 rounded"
                />
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gambar</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga Jual</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredMenus.map((menu, index) => (
                                <tr key={menu.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {menu.image ? (
                                            <img src={menu.image} alt={menu.name} className="w-16 h-16 object-cover rounded" />
                                        ) : (
                                            "No Image"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.maxBeli}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.Status}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{menu.price}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={menu.isActive}
                                                onChange={() => handleToggleIsActive(menu.id, menu.isActive)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-900">
                                                {menu.isActive ? "Aktif" : "Nonaktif"}
                                            </span>

                                        </label>
                                    </td>
                                </tr>
                            ))}
                            {filteredMenus.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="px-6 py-4 text-center">
                                        Tidak ada data menu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
