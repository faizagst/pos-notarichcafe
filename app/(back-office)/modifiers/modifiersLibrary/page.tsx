"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Ingredient {
  id: number;
  name: string;
}

interface ModifierIngredient {
  id: number;
  modifierId: number;
  ingredientId: number;
  amount: number;
  ingredient: Ingredient;
}

interface ModifierCategory {
  id: number;
  name: string;
}

interface Modifier {
  id: number;
  name: string;
  price: number;
  category: ModifierCategory;
  ingredients: ModifierIngredient[];
}

export default function ModifierPage() {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<ModifierCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    categoryId: 0,
    selectedIngredients: [] as { ingredientId: number; amount: number }[],
  });

  // Fetch all modifiers
  const fetchModifiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/modifier");
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gagal mengambil data modifier: ${errorData || response.statusText}`);
      }
      const data = await response.json();
      setModifiers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching modifiers:", err);
      setError(err.message || "Gagal memuat data modifier. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all ingredients
  const fetchIngredients = async () => {
    try {
      const response = await fetch("/api/ingredients");
      if (!response.ok) throw new Error("Gagal mengambil data ingredient");
      const data = await response.json();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    }
  };

  // Fetch all modifier categories
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/modifierCategory");
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gagal mengambil data kategori: ${errorData || response.statusText}`);
      }
      const data = await response.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Gagal mengambil data kategori modifier.");
    }
  };

  useEffect(() => {
    fetchModifiers();
    fetchIngredients();
    fetchCategories();
  }, []);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "categoryId" ? parseFloat(value) || 0 : value,
    }));
  };

  // Handle ingredient selection and amount
  const handleIngredientChange = (index: number, field: "ingredientId" | "amount", value: string) => {
    const updatedIngredients = [...formData.selectedIngredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: field === "amount" ? parseFloat(value) || 0 : Number(value),
    };
    setFormData((prev) => ({ ...prev, selectedIngredients: updatedIngredients }));
  };

  // Add new ingredient row
  const addIngredientRow = () => {
    setFormData((prev) => ({
      ...prev,
      selectedIngredients: [...prev.selectedIngredients, { ingredientId: 0, amount: 0 }],
    }));
  };

  // Remove ingredient row
  const removeIngredientRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedIngredients: prev.selectedIngredients.filter((_, i) => i !== index),
    }));
  };

  // Create or Update modifier
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const url = "/api/modifier";

    const requestBody = {
      ...(isEditing && { id: isEditing }),
      name: formData.name,
      price: formData.price,
      categoryId: formData.categoryId,
      ingredients: formData.selectedIngredients.filter((ing) => ing.ingredientId > 0 && ing.amount > 0),
    };
    console.log("Sending request:", { method, url, body: requestBody });

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || data.message || `Gagal ${isEditing ? "mengedit" : "menambahkan"} modifier`);
        return;
      }

      await fetchModifiers();
      toast.success(`Modifier berhasil ${isEditing ? "diperbarui" : "ditambahkan"}!`);
      setIsAdding(false);
      setIsEditing(null);
      setFormData({ name: "", price: 0, categoryId: 0, selectedIngredients: [] });
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(`${err.message || `Gagal ${isEditing ? "mengedit" : "menambahkan"} modifier`}`);
    }
  };

  // Delete modifier
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus modifier ini?")) return;

    try {
      const response = await fetch(`/api/modifier?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchModifiers();
        toast.success("Modifier berhasil dihapus!");
      } else {
        const errorData = await response.json();
        toast.error(`Gagal menghapus modifier: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Gagal menghapus modifier");
    }
  };

  // Edit modifier
  const startEditing = (modifier: Modifier) => {
    setIsEditing(modifier.id);
    setFormData({
      name: modifier.name,
      price: modifier.price,
      categoryId: modifier.category.id,
      selectedIngredients: modifier.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        amount: ing.amount,
      })),
    });
    console.log("Editing modifier with ID:", modifier.id);
  };

  // Filter data modifier berdasarkan input search
  const filteredModifiers = modifiers.filter((modifier) =>
    modifier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Daftar Modifier</h1>
      <button
        onClick={() => setIsAdding(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-8"
      >
        Add Modifier
      </button>

      {/* Search Bar */}
      <div className="mb-4 flex justify-end">
        <input
          type="text"
          placeholder="Search Modifier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3 p-2 border border-gray-300 rounded"
        />
      </div>

      {(isAdding || isEditing) && (
        <Modal
          onClose={() => {
            setIsAdding(false);
            setIsEditing(null);
            setFormData({ name: "", price: 0, categoryId: 0, selectedIngredients: [] });
          }}
        >
          <div>
            <h2 style={{ marginBottom: "15px" }}>
              {isEditing ? "Edit Modifier" : "Tambah Modifier Baru"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Nama Modifier:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Harga Modifier:</label>
                <input
                  type="number"
                  name="price"
                  placeholder="0"
                  value={formData.price || "0"}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="100"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Kategori Modifier:</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <h3 style={{ marginBottom: "10px" }}>Ingredients:</h3>
                {formData.selectedIngredients.map((ing, index) => (
                  <div key={index} className="flex gap-4 mb-2 items-center">
                    <select
                      value={ing.ingredientId}
                      onChange={(e) => handleIngredientChange(index, "ingredientId", e.target.value)}
                      style={{
                        width: "50%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                      required
                    >
                      <option value="">Pilih Ingredient</option>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={ing.amount || ""}
                      onChange={(e) => handleIngredientChange(index, "amount", e.target.value)}
                      placeholder="0"
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: "25%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-5 h-5" /> Tambah Ingredient
                </button>
              </div>
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                    setFormData({ name: "", price: 0, categoryId: 0, selectedIngredients: [] });
                  }}
                  style={{
                    backgroundColor: "#ccc",
                    color: "#000",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: "10px",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: isEditing ? "#2196F3" : "#4CAF50",
                    color: "#fff",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {loading ? (
        <div style={{ padding: "20px", fontSize: "18px" }}>Loading...</div>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : modifiers.length === 0 ? (
        <p className="text-center text-[#979797]">Belum ada modifier.</p>
      ) : searchTerm && filteredModifiers.length === 0 ? (
        <p className="text-center text-[#979797]">Data tidak ditemukan</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#fff",
          }}
        >
          <thead style={{ backgroundColor: "#f2f2f2" }}>
            <tr>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Nama</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Harga</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Kategori</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Ingredient</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredModifiers.map((modifier, index) => (
              <tr key={modifier.id} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>{modifier.name}</td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  Rp{modifier.price.toLocaleString()}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>{modifier.category.name}</td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  {modifier.ingredients.map((ing) => (
                    <div key={ing.id}>
                      {ing.ingredient.name} ({ing.amount})
                    </div>
                  ))}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd", textAlign: "center" }}>
                  <button
                    onClick={() => startEditing(modifier)}
                    style={{
                      backgroundColor: "#2196F3",
                      color: "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "8px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(modifier.id)}
                    style={{
                      backgroundColor: "#f44336",
                      color: "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Komponen Modal dengan desain modern
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "350px",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
