"use client";
import { useState, useEffect, FormEvent } from "react";
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
}

export default function ManagerMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMenuId, setEditMenuId] = useState<number | null>(null);
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

  const handleDelete = async (menuId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      const res = await fetch(`/api/menu/${menuId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMenus(menus.filter((menu) => menu.id !== menuId));
      } else {
        toast.error("Gagal menghapus menu.");
      }
    } catch (error) {
      console.error("Error deleting menu:", error);
    }
  };

  const handleEdit = (menuId: number) => {
    setEditMenuId(menuId);
  };

  const handleCloseModal = () => {
    setEditMenuId(null);
  };

  const handleMenuUpdated = () => {
    fetchMenus();
  };

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Daftar Menu</h1>
      <button
        onClick={() => setShowAddModal(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Menu
      </button>

      {/* Search bar*/}
      <div className=" mb-4 flex justify-end">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Bakul</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diskon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifiers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">{menu.hargaBakul}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {menu.discounts && menu.discounts.length > 0 ? (
                      menu.discounts.map((d, index) => (
                        <span key={d.discount.id}>
                          {d.discount.name} ({d.discount.value}
                          {d.discount.type === "PERCENTAGE" ? "%" : ""})
                          {index < menu.discounts.length - 1 && ", "}
                        </span>
                      ))
                    ) : (
                      "Tidak ada diskon"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {menu.ingredients.map((item, index) => (
                      <span key={item.id}>
                        {item.ingredient.name} ({item.amount}{item.ingredient.unit})
                        {index < menu.ingredients.length - 1 && ", "}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4">
                    {menu.modifiers && menu.modifiers.length > 0 ? (
                      menu.modifiers.map((mod, index) => (
                        <span key={mod.modifier.id}>
                          {mod.modifier.name}
                          {index < menu.modifiers.length - 1 && ", "}
                        </span>
                      ))
                    ) : (
                      "Tidak ada modifier"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(menu.id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(menu.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Delete
                    </button>
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

          {showAddModal && (
            <AddMenuModal onCloseAction={() => setShowAddModal(false)} onMenuAddAction={fetchMenus} />
          )}
          {editMenuId !== null && (
            <EditMenuModal
              menuId={editMenuId}
              onCloseAction={handleCloseModal} // Ubah nama prop
              onMenuUpdatedAction={handleMenuUpdated} // Ubah nama prop
            />
          )}
        </div>
      );
}

      // Edit Menu Modal

      interface Category {
        id: number;
      kategori: string;
}


      interface IngredientOption {
        id: number;
      name: string;
      unit?: string;
}

      interface IngredientRow {
        ingredientId: number;
      amount: number;
}

      interface ModifierOption {
        id: number;
      name: string;
      price: number; // Tambahkan harga modifier
      category: {id: number; name: string }; // Tambahkan kategori modifier
}

      interface Discount {
        id: number;
      name: string;
      type: string;
      scope: string;
      value: number;
      isActive: boolean;
}

      interface DiscountInfo {
        discount: Discount;
}

      interface Modifier {
        modifier: {
        id: number;
      name: string;
  };
}

      interface EditMenuModalProps {
        menuId: number;
  onCloseAction: () => void; // Ubah nama prop
  onMenuUpdatedAction: () => void; // Ubah nama prop
}

      export function EditMenuModal({menuId, onCloseAction, onMenuUpdatedAction}: EditMenuModalProps) {
  const [name, setName] = useState("");
      const [description, setDescription] = useState("");
      const [price, setPrice] = useState("");
      const [image, setImage] = useState<File | null>(null);
      const [imageUrl, setImageUrl] = useState<string | null>(null);
      const [status, setStatus] = useState("tersedia");
      const [category, setCategory] = useState("makanan");
      const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
      const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);
      const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
        const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
          const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
          const [availableModifiers, setAvailableModifiers] = useState<ModifierOption[]>([]);
          const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
          const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/menuCategory");
          const data = await res.json();
          setCategories(data.categories);
      } catch (error) {
            console.error("Error fetching categories:", error);
      }
    };
          fetchCategories();
  }, []);


  // Ambil daftar ingredient yang tersedia
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await fetch("/api/ingredients");
          const data = await res.json();
          setAvailableIngredients(data);
      } catch (error) {
            console.error("Error fetching ingredients:", error);
      }
    };
          fetchIngredients();
  }, []);

  // Ambil daftar diskon dengan scope MENU
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/discount");
          const data = await res.json();
        const menuDiscounts = data.filter((d: any) => d.scope === "MENU" && d.isActive);
          setAvailableDiscounts(menuDiscounts);
      } catch (error) {
            console.error("Error fetching discounts:", error);
      }
    };
          fetchDiscounts();
  }, []);

  // Ambil daftar modifier yang tersedia
  useEffect(() => {
    const fetchModifiers = async () => {
      try {
        const res = await fetch("/api/modifier");
          const data = await res.json();
          setAvailableModifiers(data);
      } catch (error) {
            console.error("Error fetching modifiers:", error);
      }
    };
          fetchModifiers();
  }, []);

  // Ambil data menu berdasarkan menuId dan prefill form
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const res = await fetch(`/api/menu/getMenu?id=${menuId}`);
          const data = await res.json();
          if (res.ok && data.menu) {
            setName(data.menu.name);
          setDescription(data.menu.description || "");
          setPrice(data.menu.price.toString());
          setStatus(data.menu.Status || "tersedia");
          setCategory(data.menu.category);
          if (data.menu.image) {
            setImageUrl(data.menu.image);
          }
          if (data.menu.ingredients && Array.isArray(data.menu.ingredients)) {
            const rows = data.menu.ingredients.map((item: any) => ({
            ingredientId: item.ingredientId || item.ingredient.id,
          amount: item.amount,
            }));
          setIngredientRows(rows);
          }
          if (data.menu.modifiers && Array.isArray(data.menu.modifiers)) {
            const modifierIds = data.menu.modifiers.map((mod: any) => mod.modifier.id);
          setSelectedModifierIds(modifierIds);
          }
          if (data.menu.discounts && data.menu.discounts.length > 0) {
            setApplyDiscount(true);
          setSelectedDiscountId(data.menu.discounts[0].discountId.toString());
          } else {
            setApplyDiscount(false);
          setSelectedDiscountId("");
          }
        }
      } catch (error) {
            console.error("Error fetching menu data:", error);
      }
    };
          fetchMenuData();
  }, [menuId]);

  // Fungsi untuk mengelola baris ingredient
  const addIngredientRow = () => {
            setIngredientRows([...ingredientRows, { ingredientId: 0, amount: 0 }]);
  };

  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: number) => {
    const newRows = [...ingredientRows];
          newRows[index] = {...newRows[index], [field]: value };
          setIngredientRows(newRows);
  };

  const removeIngredientRow = (index: number) => {
    const newRows = ingredientRows.filter((_, i) => i !== index);
          setIngredientRows(newRows);
  };

  // Fungsi untuk mengelola modifier
  const addModifier = (modifierId: number) => {
    if (!selectedModifierIds.includes(modifierId) && modifierId !== 0) {
            setSelectedModifierIds([...selectedModifierIds, modifierId]);
    }
  };

  const removeModifier = (modifierId: number) => {
            setSelectedModifierIds(selectedModifierIds.filter((id) => id !== modifierId));
  };

          // Handler untuk submit form edit
          const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            if (!name || !price) {
              toast.error("Name dan Price wajib diisi!");
            return;
    }

            const formData = new FormData();
            formData.append("id", menuId.toString());
            formData.append("name", name);
            formData.append("description", description);
            formData.append("price", price);
            if (image) {
              formData.append("image", image);
    }
            formData.append("Status", status);
            formData.append("category", category);
            formData.append("ingredients", JSON.stringify(ingredientRows));
            formData.append("modifierIds", JSON.stringify(selectedModifierIds));
            if (applyDiscount && selectedDiscountId) {
              formData.append("discountId", selectedDiscountId);
    } else {
              formData.append("discountId", "");
    }

            try {
      const res = await fetch("/api/addMenu", {
              method: "PUT",
            body: formData,
      });
            const data = await res.json();

            if (res.ok) {
              toast.success("Menu berhasil diupdate!");
            onMenuUpdatedAction();
            onCloseAction();
      } else {
              toast.error("Gagal mengupdate menu: " + (data.message || "Unknown error"));
      }
    } catch (error) {
              console.error("Error updating menu:", error);
            toast.error("Terjadi kesalahan saat mengupdate menu.");
    }
  };

            return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg inline-block mx-auto max-w-full max-h-[90vh] overflow-y-auto">
                <h1 className="text-center text-2xl font-bold mb-6">Edit Menu</h1>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-semibold mb-2">Nama Menu:</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Status:</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      >
                        <option value="tersedia">Tersedia</option>
                        <option value="habis">Habis</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Price:</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Category:</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.kategori}>
                            {cat.kategori}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Section Ingredients */}
                  <div className="mb-4 border-t pt-4">
                    <h2 className="text-xl font-semibold mb-2">Ingredients</h2>
                    {ingredientRows.map((row, index) => {
                      const selectedIngredient = availableIngredients.find(
                        (ing) => ing.id === row.ingredientId
                      );
                      return (
                        <div key={index} className="flex gap-2 items-center mb-2">
                          <select
                            value={row.ingredientId}
                            onChange={(e) =>
                              updateIngredientRow(index, "ingredientId", parseInt(e.target.value))
                            }
                            required
                            className="flex-1 p-2 border border-gray-300 rounded"
                          >
                            <option value={0}>Pilih Ingredient</option>
                            {availableIngredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="number"
                              placeholder="Amount"
                              value={row.amount}
                              onChange={(e) =>
                                updateIngredientRow(index, "amount", parseFloat(e.target.value))
                              }
                              required
                              className="p-2 border border-gray-300 rounded"
                            />
                            {selectedIngredient?.unit && (
                              <span className="ml-2">{selectedIngredient.unit}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Add Ingredient
                    </button>
                  </div>

                  {/* Section Modifier */}
                  <div className="mb-4 border-t pt-4">
                    <h2 className="text-xl font-semibold mb-2">Modifiers</h2>
                    <label className="block font-semibold mb-2">
                      Pilih Modifier:
                      <select
                        onChange={(e) => addModifier(parseInt(e.target.value))}
                        value={0}
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      >
                        <option value={0}>Pilih Modifier</option>
                        {availableModifiers
                          .filter((mod) => !selectedModifierIds.includes(mod.id))
                          .map((mod) => (
                            <option key={mod.id} value={mod.id}>
                              {mod.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {selectedModifierIds.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-semibold">Modifier yang Dipilih:</h3>
                        <ul className="list-disc pl-5">
                          {selectedModifierIds.map((modId) => {
                            const modifier = availableModifiers.find((m) => m.id === modId);
                            return (
                              <li key={modId} className="flex items-center justify-between py-1">
                                <span>{modifier?.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeModifier(modId)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Section Diskon */}
                  <div className="mb-4 border-t pt-4">
                    <h2 className="text-xl font-semibold mb-2">Diskon</h2>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={applyDiscount}
                        onChange={(e) => setApplyDiscount(e.target.checked)}
                        className="mr-2"
                      />
                      Terapkan Diskon untuk Menu ini
                    </label>
                    {applyDiscount && (
                      <div>
                        <label className="block font-semibold mb-2">
                          Pilih Diskon:
                          <select
                            value={selectedDiscountId}
                            onChange={(e) => setSelectedDiscountId(e.target.value)}
                            required={applyDiscount}
                            className="w-full p-2 border border-gray-300 rounded mt-1"
                          >
                            <option value="">Pilih Diskon</option>
                            {availableDiscounts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.value}
                                {d.type === "PERCENTAGE" ? "%" : ""})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block font-semibold mb-2">Deskripsi:</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Gambar:</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            setImage(e.target.files[0]);
                          }
                        }}
                        className="w-full mt-1"
                      />
                      {imageUrl && !image && (
                        <img src={imageUrl} alt="current menu" className="mt-2 max-h-40 object-cover" />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={onCloseAction}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Update Menu
                    </button>
                  </div>
                </form>
              </div>
            </div>
            );
}

            //Add Modal Menu
            interface ModifierCategory {
              id: number;
            name: string;
}

            interface AddMenuModalProps {
              onCloseAction: () => void;
  onMenuAddAction: () => void;
}

            export function AddMenuModal({onCloseAction, onMenuAddAction}: AddMenuModalProps) {
  const [name, setName] = useState("");
            const [description, setDescription] = useState("");
            const [price, setPrice] = useState("");
            const [image, setImage] = useState<File | null>(null);
            const [status, setStatus] = useState("tersedia");
            const [category, setCategory] = useState("makanan");
            const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
            const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);
            const [categories, setCategories] = useState<Category[]>([]);

            // State untuk diskon
            const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
              const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
              const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");

                // State untuk modifier
                const [availableModifiers, setAvailableModifiers] = useState<ModifierOption[]>([]);
                const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]); // Tetap array untuk mendukung beberapa modifier dari kategori berbeda


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/menuCategory");
                const data = await res.json();
                setCategories(data.categories);
      } catch (error) {
                  console.error("Error fetching categories:", error);
      }
    };
                fetchCategories();
  }, []);


  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await fetch("/api/ingredients");
                const data = await res.json();
                setAvailableIngredients(data);
      } catch (error) {
                  console.error("Error fetching ingredients:", error);
      }
    };
                fetchIngredients();
  }, []);

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/discount");
                const data = await res.json();
        const menuDiscounts = data.filter((d: Discount) => d.scope === "MENU");
                setAvailableDiscounts(menuDiscounts);
      } catch (error) {
                  console.error("Error fetching discounts:", error);
      }
    };
                fetchDiscounts();
  }, []);

  useEffect(() => {
    const fetchModifiers = async () => {
      try {
        const res = await fetch("/api/modifier");
                const data = await res.json();
                setAvailableModifiers(data);
      } catch (error) {
                  console.error("Error fetching modifiers:", error);
      }
    };
                fetchModifiers();
  }, []);

  const addIngredientRow = () => {
                  setIngredientRows([...ingredientRows, { ingredientId: 0, amount: 0 }]);
  };

  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: number) => {
    const newRows = [...ingredientRows];
                newRows[index] = {...newRows[index], [field]: value };
                setIngredientRows(newRows);
  };

  const removeIngredientRow = (index: number) => {
    const newRows = ingredientRows.filter((_, i) => i !== index);
                setIngredientRows(newRows);
  };

  const addModifier = (modifierId: number) => {
    if (!selectedModifierIds.includes(modifierId) && modifierId !== 0) {
                  setSelectedModifierIds([...selectedModifierIds, modifierId]);
    }
  };

  const removeModifier = (modifierId: number) => {
                  setSelectedModifierIds(selectedModifierIds.filter((id) => id !== modifierId));
  };

                const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();

                  if (!name || !price || !image) {
                    toast.error("Name, Price, dan Image (untuk tambah) wajib diisi!");
                  return;
    }

                  const formData = new FormData();
                  formData.append("name", name);
                  formData.append("description", description);
                  formData.append("price", parseFloat(price).toString());
                  if (image) formData.append("image", image);
                  formData.append("Status", status);
                  formData.append("category", category);
                  formData.append("ingredients", JSON.stringify(ingredientRows));
                  formData.append("modifierIds", JSON.stringify(selectedModifierIds));
                  if (applyDiscount && selectedDiscountId) formData.append("discountId", selectedDiscountId);

                  try {
      const res = await fetch("/api/addMenu", {
                    method:"POST",
                  body: formData,
      });

                  const data = await res.json();
                  console.log("Response API:", data);

                  if (res.ok) {
                    toast.success("Berhasil buat Menu!");
                  setName("");
                  setDescription("");
                  setPrice("");
                  setImage(null);
                  setStatus("tersedia");
                  setCategory("makanan");
                  setIngredientRows([]);
                  setSelectedModifierIds([]);
                  setApplyDiscount(false);
                  setSelectedDiscountId("");
                  onCloseAction();
                  onMenuAddAction();

      } else {
                    toast.error("Gagal menyimpan menu: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      if (error instanceof Error) {
                    console.error("Error submitting form:", error.message);
                  toast.error("Terjadi kesalahan: " + error.message);
      } else {
                    console.error("Error submitting form:", error);
                  toast.error("Terjadi kesalahan yang tidak diketahui.");
      }
    }
  };

  // Kelompokkan modifier berdasarkan kategori
  const modifierGroups = availableModifiers.reduce((acc, mod) => {
    const categoryId = mod.category.id;
                  if (!acc[categoryId]) {
                    acc[categoryId] = { category: mod.category, modifiers: [] };
    }
                  acc[categoryId].modifiers.push(mod);
                  return acc;
  }, { } as {[key: number]: {category: ModifierCategory; modifiers: ModifierOption[] } });

                  return (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg inline-block mx-auto max-w-full max-h-[90vh] overflow-y-auto">
                      <h1 className="text-xl font-semibold mb-4">Tambah Menu</h1>
                      <form onSubmit={handleSubmit} encType="multipart/form-data">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block font-semibold mb-2">
                              Nama Menu:
                              <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded mt-1"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block font-semibold mb-2">
                              Price:
                              <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded mt-1"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block font-semibold mb-2">
                              Status:
                              <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded mt-1"
                              >
                                <option value="tersedia">Tersedia</option>
                                <option value="habis">Habis</option>
                              </select>
                            </label>
                          </div>
                          <div>
                            <label className="block font-semibold mb-2">
                              Category:
                              <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded mt-1"
                              >
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.kategori}>
                                    {cat.kategori}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="col-span-2">
                            <label className="block font-semibold mb-2">
                              Deskripsi:
                              <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y"
                              />
                            </label>
                          </div>
                          <div className="col-span-2">
                            <label className="block font-semibold mb-2">
                              Gambar: {"(Wajib saat tambah)"}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setImage(e.target.files[0]);
                                  }
                                }}
                                className="w-full mt-1"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Ingredients Section */}
                        <div className="mt-6">
                          <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
                          {ingredientRows.map((row, index) => {
                            const selectedIngredient = availableIngredients.find(
                              (ing) => ing.id === row.ingredientId
                            );
                            return (
                              <div key={index} className="flex gap-4 items-center mb-4">
                                <select
                                  value={row.ingredientId}
                                  onChange={(e) =>
                                    updateIngredientRow(index, "ingredientId", parseInt(e.target.value))
                                  }
                                  required
                                  className="flex-1 p-2 border border-gray-300 rounded"
                                >
                                  <option value={0}>Pilih Ingredient</option>
                                  {availableIngredients.map((ing) => (
                                    <option key={ing.id} value={ing.id}>
                                      {ing.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={row.amount}
                                    onChange={(e) =>
                                      updateIngredientRow(index, "amount", parseFloat(e.target.value))
                                    }
                                    required
                                    className="p-2 border border-gray-300 rounded"
                                  />
                                  {selectedIngredient?.unit && <span>{selectedIngredient.unit}</span>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeIngredientRow(index)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={addIngredientRow}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                          >
                            Add Ingredient
                          </button>
                        </div>

                        {/* Modifiers Section */}
                        <div className="mt-6 border-t pt-4">
                          <h2 className="text-xl font-semibold mb-4">Modifiers (Optional)</h2>
                          {Object.entries(modifierGroups).map(([categoryId, group]) => (
                            <div key={categoryId} className="mb-4">
                              <label className="block font-semibold mb-2">
                                {group.category.name}:
                                <select
                                  onChange={(e) => addModifier(parseInt(e.target.value))}
                                  value={0}
                                  className="w-full p-2 border border-gray-300 rounded mt-1"
                                >
                                  <option value={0}>Pilih {group.category.name}</option>
                                  {group.modifiers
                                    .filter((mod) => !selectedModifierIds.includes(mod.id))
                                    .map((mod) => (
                                      <option key={mod.id} value={mod.id}>
                                        {mod.name} (Rp{mod.price.toLocaleString()})
                                      </option>
                                    ))}
                                </select>
                              </label>
                            </div>
                          ))}
                          {selectedModifierIds.length > 0 && (
                            <div className="mt-4">
                              <h3 className="font-semibold">Modifier yang Dipilih:</h3>
                              <ul className="list-disc pl-5">
                                {selectedModifierIds.map((modId) => {
                                  const modifier = availableModifiers.find((m) => m.id === modId);
                                  return (
                                    <li key={modId} className="flex items-center justify-between py-1">
                                      <span>
                                        {modifier?.name} (Rp{modifier?.price.toLocaleString()}) - {modifier?.category.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeModifier(modId)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Discount Section */}
                        <div className="mt-6 border-t pt-4">
                          <h2 className="text-xl font-semibold mb-4">Discount (Optional)</h2>
                          <label className="flex items-center mb-4">
                            <input
                              type="checkbox"
                              checked={applyDiscount}
                              onChange={(e) => setApplyDiscount(e.target.checked)}
                              className="mr-2"
                            />
                            Terapkan Diskon untuk Menu ini
                          </label>
                          {applyDiscount && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="block font-semibold mb-2">
                                  Pilih Diskon:
                                  <select
                                    value={selectedDiscountId}
                                    onChange={(e) => setSelectedDiscountId(e.target.value)}
                                    required={applyDiscount}
                                    className="w-full p-2 border border-gray-300 rounded mt-1"
                                  >
                                    <option value="">Pilih Diskon</option>
                                    {availableDiscounts.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name} - {d.value} {d.type}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Button */}
                        <div className="flex justify-end">
                          <button type="button" onClick={onCloseAction} className="mr-4 px-4 py-2 border rounded">
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Tambah Menu
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                  );
}

