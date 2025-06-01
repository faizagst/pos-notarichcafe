"use client";
import { useState, useEffect, FormEvent } from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

// Tipe data Ingredient sesuai skema baru
type Ingredient = {
  id: number;
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stockMin: number;
  stock: number; // Stock akhir
  unit: string;
  finishedUnit: string;
  categoryId: number;
  type: "RAW" | "SEMI_FINISHED";
  price: number;
};
type Categories = {
  id: number;
  name: string;
  description: string;
};

// Tipe extended untuk menyimpan nilai originalStockIn dan originalWasted (untuk modal edit)
type SelectedIngredient = Ingredient & {
  originalStockIn: number;
  originalWasted: number;
};

// Tipe untuk raw ingredient (untuk digunakan pada modal semi finished)
// Data raw ingredient biasanya di-fetch dari API; di sini disimulasikan secara statis.
type RawIngredient = {
  id: number;
  name: string;
  price: number; // Harga per unit raw
  unit: string;
};

// Tipe untuk komposisi semi finished ingredient
type SemiComposition = {
  rawIngredientId: number | "";
  amount: number | "";
};

export default function IngredientsTable() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Categories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedIngredient, setSelectedIngredient] = useState<SelectedIngredient | null>(null);
  // State untuk input tambahan stockIn dan wasted pada modal edit (bahan RAW)
  const [additionalStock, setAdditionalStock] = useState<string>("");
  const [additionalWasted, setAdditionalWasted] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredIngredient, setFilteredIngredient] = useState<Ingredient[]>([]);
  const router = useRouter();

  // State untuk modal pilih tipe ingredient baru
  const [showSelectTypeModal, setShowSelectTypeModal] = useState(false);
  // State untuk modal tambah semi finished ingredient (untuk tambah baru)
  const [showSemiModal, setShowSemiModal] = useState(false);
  // State untuk modal tambah raw ingredient baru
  const [showRawModal, setShowRawModal] = useState(false);

  // --- State untuk form semi finished ingredient (untuk TAMBAH) ---
  const [semiName, setSemiName] = useState("");
  const [semiCategory, setSemiCategory] = useState("");
  const [semiFinishedUnit, setSemiFinishedUnit] = useState("gram");
  const [producedQuantity, setProducedQuantity] = useState<number>(0);
  const [composition, setComposition] = useState<SemiComposition[]>([]);

  // --- State untuk modal edit semi finished ingredient (untuk EDIT) ---
  const [semiEditName, setSemiEditName] = useState("");
  const [semiEditCategory, setSemiEditCategory] = useState("");
  const [semiEditFinishedUnit, setSemiEditFinishedUnit] = useState("gram");
  const [semiEditProducedQuantity, setSemiEditProducedQuantity] = useState<number>(0);
  const [semiEditStockIn, setSemiEditStockIn] = useState(0);
  const [semiEditWasted, setSemiEditWasted] = useState(0);
  const [semiEditStockMin, setSemiEditStockMin] = useState(0);
  const [semiEditComposition, setSemiEditComposition] = useState<SemiComposition[]>([]);
  const [editingSemi, setEditingSemi] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalPrice2, setTotalPrice2] = useState(0);

  // State untuk form ingredient
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [warehouseStart, setWarehouseStart] = useState("");
  // Field dengan nilai default yang tidak diubah
  const [stockIn] = useState("0");
  const [used] = useState("0");
  const [wasted] = useState("0");
  const [stockMin, setStockMin] = useState("");
  // Unit untuk ingredient (misalnya: gram, pack, dll)
  const [unit, setUnit] = useState("");
  // Field untuk finished unit (misalnya: gram, liter), default "-"
  const [finishedUnit, setFinishedUnit] = useState("-");
  // Field untuk harga (angka)
  const [price, setPrice] = useState("");
  // Field kategori, default "main"
  const [category, setCategory] = useState("");
  // Dropdown untuk tipe ingredient, default RAW
  const [type, setType] = useState("RAW");

  // Fungsi helper untuk menghitung total harga komposisi dari array komposisi yang diberikan
  const calculateTotalCompositionPrice = (comp: SemiComposition[]) => {
    return comp.reduce((total, row) => {
      const raw = rawIngredientsList.find((r) => r.id === row.rawIngredientId);
      if (raw && row.amount) {
        return total + raw.price * Number(row.amount);
      }
      return total;
    }, 0);
  };
  const calculateAndUpdateTotalPrice = async () => {
    const response = await fetch('/api/ingredients/raw');
    const updatedRawIngredients = await response.json();
    setRawIngredientsList(updatedRawIngredients);

    const total = calculateTotalCompositionPrice(semiEditComposition);
    setTotalPrice(total);
  };

  // Panggil fungsi ini saat diperlukan, misalnya saat komponen mount atau ada perubahan
  useEffect(() => {
    calculateAndUpdateTotalPrice();
  }, [semiEditComposition]);

  const calculateAndUpdateTotalPrice2 = async () => {
    const response = await fetch('/api/ingredients/raw');
    const updatedRawIngredients = await response.json();
    setRawIngredientsList(updatedRawIngredients);

    const total = calculateTotalCompositionPrice(composition);
    setTotalPrice2(total);
  };

  // Panggil fungsi ini saat diperlukan, misalnya saat komponen mount atau ada perubahan
  useEffect(() => {
    calculateAndUpdateTotalPrice2();
  }, [composition]);


  // Daftar raw ingredient, diambil dari API /api/bahanRaw
  const [rawIngredientsList, setRawIngredientsList] = useState<RawIngredient[]>([]);
  useEffect(() => {
    const fetchRawIngredients = async () => {
      try {
        const res = await fetch("/api/ingredients/raw");
        if (!res.ok) {
          throw new Error("Gagal mengambil data raw ingredients.");
        }
        const data = await res.json();
        setRawIngredientsList(data);
      } catch (err: any) {
        console.error("Error fetching raw ingredients:", err.message);
      }
    };

    fetchRawIngredients();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/ingredientCategory");
        if (!res.ok) {
          throw new Error("Gagal mengambil data categori.");
        }
        const data = await res.json();
        setCategories(data.categories);
      } catch (err: any) {
        console.error("Error fetching raw ingredients:", err.message);
      }
    };

    fetchCategories();
  }, []);

  // Fungsi untuk mengambil data ingredients dari API
  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (!res.ok) {
        throw new Error("Gagal mengambil data ingredients.");
      }
      const data = await res.json();
      setIngredients(data);
      setFilteredIngredient(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    const filtered = ingredients.filter((ingredient) =>
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredIngredient(filtered);
  }, [searchQuery, ingredients]);

  // Fungsi untuk menghapus ingredient
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ingredient ini?")) return;
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Gagal menghapus ingredient.");
      }
      setIngredients(ingredients.filter((ing) => ing.id !== id));
      toast.success("Ingredient berhasil dihapus!");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus ingredient.");
      toast.error("Ingredient gagal dihapus!");
    }
  };

  // Modal Edit untuk bahan RAW (biasa)
  const handleEdit = async (id: number) => {
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      if (ing.type === "RAW") {
        setSelectedIngredient({
          ...ing,
          originalStockIn: ing.stockIn,
          originalWasted: ing.wasted,
        });
        setAdditionalStock("");
        setAdditionalWasted("");
        setEditingSemi(false);
      } else if (ing.type === "SEMI_FINISHED") {
        // Set nilai dasar untuk modal edit semi finished
        setSelectedIngredient({
          ...ing,
          originalStockIn: ing.stockIn,
          originalWasted: ing.wasted,
        });

        // Set nilai form edit semi finished
        setSemiEditName(ing.name);
        setSemiEditCategory(ing.categoryId.toString()); // Pastikan categoryId dikonversi ke string
        setSemiEditFinishedUnit(ing.finishedUnit);
        setSemiEditStockIn(ing.stockIn || 0);
        setSemiEditWasted(ing.wasted || 0);
        setSemiEditStockMin(ing.stockMin || 0);

        // Fetch data komposisi raw ingredient yang sebelumnya digunakan
        try {
          const res = await fetch(`/api/ingredientComposition?semiIngredientId=${ing.id}`);
          if (res.ok) {
            const compositionData = await res.json();
            setSemiEditComposition(compositionData);
          } else {
            console.error("Gagal mengambil data composition");
            setSemiEditComposition([]);
          }
        } catch (error) {
          console.error("Error fetching composition:", error);
          setSemiEditComposition([]);
        }

        // Set flag untuk menampilkan modal edit semi finished
        setEditingSemi(true);
      }
    }
  };


  // Fungsi untuk menutup modal edit (RAW atau SEMI_FINISHED)
  const handleModalClose = () => {
    setSelectedIngredient(null);
    // Juga tutup modal edit semi finished jika terbuka
    setSemiEditName("");
    setSemiEditCategory("");
    setSemiEditFinishedUnit("gram");
    setSemiEditProducedQuantity(0);
    setSemiEditStockIn(0);
    setSemiEditWasted(0);
    setSemiEditStockMin(0);
    setSemiEditComposition([]);
    setEditingSemi(false);

  };

  // Submit modal edit untuk bahan RAW
 const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!selectedIngredient) return;

  // Hitung nilai akhir baru berdasarkan original + tambahan
  const updatedStockIn =
    selectedIngredient.originalStockIn + (parseFloat(additionalStock) || 0);
  const updatedWasted =
    selectedIngredient.originalWasted + (parseFloat(additionalWasted) || 0);

  try {
    const res = await fetch(`/api/ingredients/${selectedIngredient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...selectedIngredient,
        stockIn: updatedStockIn,
        wasted: updatedWasted,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success("Ingredient berhasil diedit!");
      fetchIngredients();
      calculateAndUpdateTotalPrice();
      setIngredients(
        ingredients.map((ing) =>
          ing.id === selectedIngredient.id ? data.ingredient : ing
        )
      );
      setSelectedIngredient(null);
    } else {
      toast.error(data.message || "Gagal mengupdate ingredient.");
    }
  } catch (err) {
    console.error(err);
    toast.error("Terjadi kesalahan saat mengupdate ingredient.");
  }
};


  // Submit modal edit untuk bahan SEMI_FINISHED
  const handleSemiEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Buat payload serupa dengan payload tambah semi finished
    const totalCompositionPrice = totalPrice;
    const payload = {
      id: selectedIngredient?.id,
      name: semiEditName,
      categoryId: parseInt(semiEditCategory),
      finishedUnit: semiEditFinishedUnit,
      stockIn: semiEditStockIn,
      type: "SEMI_FINISHED",
      price: totalCompositionPrice,
      composition: semiEditComposition,
      wasted: semiEditWasted,
      stockMin: semiEditStockMin,
    };

    try {
      const res = await fetch(`/api/ingredients/semiFinished/${selectedIngredient?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Semi finished ingredient berhasil diedit!");
        fetchIngredients();
        handleModalClose();
      } else {
        toast.error(data.message || "Gagal mengupdate semi finished ingredient.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat mengupdate semi finished ingredient.");
    }
  };

  const handleResetDailyStock = async () => {
    const confirmed = confirm("Apakah Anda yakin ingin mereset stok harian?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/rekap/dailyStock", { method: "POST" });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/recapNotarich/stockCafe");
    } catch (error) {
      console.error("Error resetting daily stock:", error);
      toast.error("Terjadi kesalahan saat mereset stok harian.");
    }
  }

  const lowStockIngredients = ingredients.filter(
    (ingredient) => ingredient.stock <= ingredient.stockMin
  );


  // Modal pilihan tipe ingredient baru
  const handleAddIngredient = () => {
    setShowSelectTypeModal(true);
  };

  const handleSelectRaw = () => {
    setShowSelectTypeModal(false);
    setShowRawModal(true);
  };

  const handleSelectSemi = () => {
    setShowSelectTypeModal(false);
    setShowSemiModal(true);
  };

  // Fungsi untuk menambahkan baris baru pada komposisi semi finished (untuk TAMBAH)
  const addCompositionRow = () => {
    setComposition([...composition, { rawIngredientId: "", amount: "" }]);
  };
  const removeCompositionRow = (index: number) => {
    const newRows = composition.filter((_, i) => i !== index);
    setComposition(newRows);
  };

  // Fungsi untuk mengubah nilai pada komposisi (untuk TAMBAH)
  const handleCompositionChange = (
    index: number,
    field: keyof SemiComposition,
    value: string
  ) => {
    const newComposition = [...composition];
    newComposition[index] = {
      ...newComposition[index],
      [field]:
        field === "rawIngredientId"
          ? value === "" ? "" : parseInt(value)
          : value === "" ? "" : parseFloat(value),
    };
    setComposition(newComposition);
  };

  // Event handler untuk mencegah simbol "-" dan "+"
  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "+") {
      e.preventDefault();
    }
  };

  //Fungsi untuk Add Raw Ingeridient submit
  const handleRawSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasi bahwa semua field yang diperlukan telah diisi
    if (!name || !start || !warehouseStart || !stockMin || !unit || !price) {
      toast.error("Semua field harus diisi!");
      return;
    }

    const data = {
      name,
      start: parseFloat(start),
      warehouseStart: parseFloat(warehouseStart),
      stockIn: parseFloat(stockIn),
      used: parseFloat(used),
      wasted: parseFloat(wasted),
      stockMin: parseFloat(stockMin),
      unit,
      finishedUnit,
      categoryId: parseInt(category),
      type,
      price: parseFloat(price),
    };

    try {
      const res = await fetch("/api/addIngredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok) {
        toast.success(result.toast?.text || "Ingredient berhasil dibuat!");
        // Reset field yang dapat diubah
        setName("");
        setStart("");
        setWarehouseStart("");
        setStockMin("");
        setUnit("");
        setFinishedUnit("gram");
        setCategory("");
        setType("RAW");
        setPrice("");
        setShowRawModal(false);
        fetchIngredients();
      } else {
        toast.error(result.message || "Gagal membuat ingredient.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat membuat ingredient.");
    }
  };

  // Fungsi untuk submit form semi finished ingredient (untuk TAMBAH)
  const handleSemiSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!semiName || !semiCategory || !semiFinishedUnit || !producedQuantity) {
      toast.error("Semua field wajib diisi untuk semi finished ingredient.");
      return;
    }
    const totalCompositionPrice = totalPrice2;
    const payload = {
      name: semiName,
      categoryId: parseInt(semiCategory), // Ubah ke categoryId
      finishedUnit: semiFinishedUnit,
      producedQuantity,
      type: "SEMI_FINISHED",
      price: totalCompositionPrice,
      composition,
    };
    try {
      const res = await fetch("/api/addSemiFinishedIngredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Semi finished ingredient berhasil dibuat!");
        setSemiName("");
        setSemiCategory("");
        setSemiFinishedUnit("gram");
        setProducedQuantity(0);
        setComposition([]);
        setShowSemiModal(false);
        fetchIngredients();
      } else {
        toast.error(data.message || "Gagal membuat semi finished ingredient.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan pada server.");
    }
  };

  return (
    <div className="p-10 mt-[5px]">
      <h1 className="text-2xl font-bold mb-4">Daftar Ingredients</h1>
      <button onClick={handleAddIngredient} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Ingredient
      </button>


      <div className="p-4">
        {lowStockIngredients.length > 0 ? (
          lowStockIngredients.map((ingredient) => (
            <p key={ingredient.id} className="text-lg font-semibold text-red-600">
              Stock untuk {ingredient.name} {ingredient.stock} {ingredient.unit} (Minimum: {ingredient.stockMin} {ingredient.unit})
            </p>
          ))
        ) : (
          <p className="text-green-600">Semua stok dalam keadaan baik.</p>
        )}
      </div>

      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder="Cari menu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-1/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock In Cafe</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wasted</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock Min</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock Akhir</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga per Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Finished Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIngredient.map((ingredient, index) => {
                const categoryName = categories.find((cat) => cat.id === ingredient.categoryId)?.name || "Unknown";
                return (
                  <tr key={ingredient.id} className="text-center">
                    <>
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{ingredient.name}</td>
                      <td className="px-4 py-2">{ingredient.start}</td>
                      <td className="px-4 py-2">{ingredient.stockIn}</td>
                      <td className="px-4 py-2">{ingredient.used}</td>
                      <td className="px-4 py-2">{ingredient.wasted}</td>
                      <td className="px-4 py-2">{ingredient.stockMin}</td>
                      <td className="px-4 py-2">{ingredient.stock}</td>
                      <td className="px-4 py-2">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                        }).format(ingredient.price)}
                      </td>
                      <td className="px-4 py-2">{ingredient.unit}</td>
                      <td className="px-4 py-2">{ingredient.finishedUnit}</td>
                      <td className="px-4 py-2">{categoryName}</td>
                      <td className="px-4 py-2">{ingredient.type}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleEdit(ingredient.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ingredient.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  </tr>
                );
              })}
              {filteredIngredient.length === 0 && (
                <tr>
                  <td className="py-2 px-4 border-b text-center" colSpan={14}>
                    Tidak ada data ingredients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <button
          onClick={handleResetDailyStock}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-200 mt-4"
        >
          Rekap Stock Cafe
        </button>
      </div>

      <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md mt-4">
        <AlertTriangle className="text-yellow-700 w-5 h-5 mr-2 mt-1" />
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-yellow-900">Perhatian:</span> Tekan tombol <span className="font-semibold text-red-600">Reset Stock</span> hanya pada saat <span className="font-semibold">closing cafe</span> untuk menyimpan rekap pengeluaran stok hari ini.
        </p>
      </div>

      {/* Modal Edit Ingredient untuk Bahan RAW */}
      {selectedIngredient && selectedIngredient.type === "RAW" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto" style={{ maxHeight: "calc(100vh - 40px)" }}>
            <h2 className="text-xl font-bold mb-4">Edit Ingredient</h2>
            <form onSubmit={handleEditSubmit}>
              {/* Field-field edit untuk bahan RAW */}
              <div className="mb-4">
                <label className="block font-medium mb-1">Name:</label>
                <input
                  type="text"
                  value={selectedIngredient.name}
                  onChange={(e) =>
                    setSelectedIngredient({ ...selectedIngredient, name: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Kategori:</label>
                <select
                  value={selectedIngredient?.categoryId || ""}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      categoryId: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Ingredient Type:</label>
                <select
                  value="RAW"
                  disabled
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="RAW">RAW</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Start:</label>
                <input
                  type="number"
                  value={selectedIngredient.start}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Stock In (Tambahan):</label>
                <input
                  type="number"
                  min="0"
                  value={additionalStock}
                  onChange={(e) => {
                    const inputVal = e.target.value;
                    setAdditionalStock(inputVal);
                    if (selectedIngredient) {
                      setSelectedIngredient({
                        ...selectedIngredient,
                        stockIn: selectedIngredient.originalStockIn + (parseFloat(inputVal) || 0),
                      });
                    }
                  }}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                  placeholder="Masukkan tambahan stock"
                />
                <p className="text-xs text-gray-500">Masukkan angka 0 jika tidak ingin stock in</p>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Used:</label>
                <input
                  type="number"
                  value={selectedIngredient.used}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                  step="any"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Wasted (Tambahan):</label>
                <input
                  type="number"
                  min="0"
                  value={additionalWasted}
                  onChange={(e) => {
                    const inputVal = e.target.value;
                    setAdditionalWasted(inputVal);
                    if (selectedIngredient) {
                      setSelectedIngredient({
                        ...selectedIngredient,
                        wasted: selectedIngredient.originalWasted + (parseFloat(inputVal) || 0),
                      });
                    }
                  }}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                  placeholder="Masukkan tambahan wasted"
                />
                <p className="text-xs text-gray-500">Masukkan angka 0 jika tidak ingin wasted</p>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Stock Min:</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={selectedIngredient.stockMin}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      stockMin: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Unit:</label>
                <input
                  type="text"
                  value={selectedIngredient.unit}
                  onChange={(e) =>
                    setSelectedIngredient({ ...selectedIngredient, unit: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">
                  Price per 1 {selectedIngredient.unit}:
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={selectedIngredient.price ?? ""}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={handleModalClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Semi Finished Ingredient */}
      {editingSemi && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-full max-h-screen overflow-y-auto" style={{ maxHeight: "calc(100vh - 40px)" }}>
            <h2 className="text-xl font-bold mb-4">Edit Semi Finished Ingredient</h2>
            <form onSubmit={handleSemiEditSubmit}>
              <div className="mb-4">
                <label className="block font-medium mb-1">Nama Semi Ingredient:</label>
                <input
                  type="text"
                  value={semiEditName}
                  onChange={(e) => setSemiEditName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Kategori Semi:</label>
                <select
                  value={semiEditCategory}
                  onChange={(e) => setSemiEditCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Finished Unit:</label>
                <input
                  type="text"
                  value={semiEditFinishedUnit}
                  onChange={(e) => setSemiEditFinishedUnit(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Jumlah yang Dibuat (stockIn):</label>
                <input
                  type="number"
                  min="0"
                  value={semiEditStockIn || "0"}
                  onChange={(e) => setSemiEditStockIn(parseFloat(e.target.value))}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-1">Jumlah Wasted:</label>
                <input
                  type="number"
                  min="0"
                  value={semiEditWasted || "0"}
                  onChange={(e) => setSemiEditWasted(parseFloat(e.target.value))}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Minimal Stock:</label>
                <input
                  type="number"
                  min="0"
                  value={semiEditStockMin || "0"}
                  onChange={(e) => setSemiEditStockMin(parseFloat(e.target.value))}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Komposisi Raw Ingredient:</h3>
                {semiEditComposition.map((row, index) => {
                  const selectedRaw = rawIngredientsList.find((r) => r.id === row.rawIngredientId);
                  return (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <select
                        value={row.rawIngredientId}
                        onChange={(e) =>
                          setSemiEditComposition((prev) => {
                            const newComp = [...prev];
                            newComp[index] = {
                              ...newComp[index],
                              rawIngredientId: e.target.value === "" ? "" : parseInt(e.target.value),
                            };
                            return newComp;
                          })
                        }
                        className="p-2 border border-gray-300 rounded"
                        required
                        disabled
                      >
                        <option value="">Pilih Raw Ingredient</option>
                        {rawIngredientsList.map((raw) => (
                          <option key={raw.id} value={raw.id}>
                            {raw.name} ({raw.unit})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          min="0"
                          value={row.amount}
                          onChange={(e) => handleCompositionChange(index, "amount", e.target.value)}
                          onKeyDown={handleNumberKeyDown}
                          className="w-24 p-2 border border-gray-300 rounded"
                          placeholder="Amount"
                          required
                          step="any"
                        />
                        <input
                          type="text"
                          value={
                            selectedRaw && row.amount
                              ? (selectedRaw.price * Number(row.amount)).toLocaleString("id-ID", {
                                style: "currency",
                                currency: "IDR",
                              })
                              : ""
                          }
                          readOnly
                          className="w-32 p-2 border border-gray-300 rounded bg-gray-100"
                          placeholder="Total Price"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompositionRow(index)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {/* <button
                  type="button"
                  onClick={() => setSemiEditComposition([...semiEditComposition, { rawIngredientId: "", amount: "" }])}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Add Raw Ingredient
                </button> */}
              </div>
              <div className="mt-4">
                <label className="block font-medium mb-1">Total Harga Komposisi:</label>
                <input
                  type="text"
                  value={totalPrice.toLocaleString("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  })}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal Pilihan Tipe Ingredient Baru */}
      {showSelectTypeModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Pilih Tipe Ingredient</h2>
            <div className="flex justify-around space-x-4">
              <button onClick={handleSelectRaw} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Raw Ingredient
              </button>
              <button onClick={handleSelectSemi} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                Semi Finished Ingredient
              </button>
            </div>
            <button onClick={() => setShowSelectTypeModal(false)} className="mt-4 text-gray-500 underline">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah Semi Finished Ingredient (untuk TAMBAH) */}
      {showSemiModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-full max-h-screen overflow-y-auto" style={{ maxHeight: "calc(100vh - 40px)" }}>
            <h2 className="text-xl font-bold mb-4">Tambah Semi Finished Ingredient</h2>
            <form onSubmit={handleSemiSubmit}>
              <div className="mb-4">
                <label className="block font-medium mb-1">Nama Semi Ingredient:</label>
                <input
                  type="text"
                  value={semiName}
                  onChange={(e) => setSemiName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Kategori:</label>
                <select
                  value={semiCategory}
                  onChange={(e) => setSemiCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Finished Unit:</label>
                <input
                  type="text"
                  value={semiFinishedUnit}
                  onChange={(e) => setSemiFinishedUnit(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Jumlah Semi Ingredient yang Dibuat:</label>
                <input
                  type="number"
                  min="0"
                  value={producedQuantity || ""}
                  onChange={(e) => setProducedQuantity(parseFloat(e.target.value))}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Komposisi Raw Ingredient:</h3>
                {composition.map((row, index) => {
                  const selectedRaw = rawIngredientsList.find((r) => r.id === row.rawIngredientId);
                  return (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <select
                        value={row.rawIngredientId}
                        onChange={(e) => handleCompositionChange(index, "rawIngredientId", e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded"
                        required
                      >
                        <option value="">Pilih Raw Ingredient</option>
                        {rawIngredientsList.map((raw) => (
                          <option key={raw.id} value={raw.id}>
                            {raw.name} ({raw.unit})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          min="0"
                          value={row.amount}
                          onChange={(e) => handleCompositionChange(index, "amount", e.target.value)}
                          onKeyDown={handleNumberKeyDown}
                          className="w-24 p-2 border border-gray-300 rounded"
                          placeholder="Amount"
                          required
                          step="any"
                        />
                        <input
                          type="text"
                          value={
                            selectedRaw && row.amount
                              ? (selectedRaw.price * Number(row.amount)).toLocaleString("id-ID", {
                                style: "currency",
                                currency: "IDR",
                              })
                              : ""
                          }
                          readOnly
                          className="w-32 p-2 border border-gray-300 rounded bg-gray-100"
                          placeholder="Total Price"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompositionRow(index)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addCompositionRow}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Add Raw Ingredient
                </button>
              </div>
              <div className="mt-4">
                <label className="block font-medium mb-1">Total Harga Komposisi:</label>
                <input
                  type="text"
                  value={calculateTotalCompositionPrice(composition).toLocaleString("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  })}

                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowSemiModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah Raw Ingredient (untuk TAMBAH) */}
      {showRawModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-full max-h-screen overflow-y-auto" style={{ maxHeight: "calc(100vh - 40px)" }}>
            <h1 className="text-2xl font-bold text-center mb-6">Create Ingredient</h1>
            <form onSubmit={handleRawSubmit} className="space-y-5">
              {/* Input Name */}
              <div>
                <label className="block font-semibold mb-1">Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="Masukkan nama ingredient"
                  required
                />
              </div>

              {/* Row untuk Start dan Warehouse Start */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block font-semibold mb-1">Stock Cafe:</label>
                  <input
                    type="number"
                    min="0"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    onKeyDown={handleNumberKeyDown}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    required
                    step="any"
                    placeholder="0"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block font-semibold mb-1">Stock Inventory:</label>
                  <input
                    type="number"
                    min="0"
                    value={warehouseStart}
                    onChange={(e) => setWarehouseStart(e.target.value)}
                    onKeyDown={handleNumberKeyDown}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    required
                    step="any"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Input Category */}
              <div className="mb-4">
                <label className="block font-medium mb-1">Kategori:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row untuk Ingredient Unit dan Finished Unit */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block font-semibold mb-1">Ingredient Unit:</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    placeholder="e.g., bottle, pack"
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block font-semibold mb-1">Finished Unit:</label>
                  <input
                    type="text"
                    value="-"
                    onChange={(e) => setFinishedUnit(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    placeholder="e.g., gram, liter"
                    readOnly
                  />
                </div>
              </div>

              {/* Input Price */}
              <div>
                <label className="block font-semibold mb-1">Price per 1 {unit}:</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="Harga per finished unit"
                />
              </div>

              {/* Input Stock Min */}
              <div>
                <label className="block font-semibold mb-1">Stock Min / Alert at:</label>
                <input
                  type="number"
                  min="0"
                  value={stockMin}
                  onChange={(e) => setStockMin(e.target.value)}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="Minimal stok"
                />
              </div>

              {/* Readonly fields: Stock In, Used, Wasted */}
              <div>
                <label className="block font-semibold mb-1">Stock In:</label>
                <input
                  type="number"
                  value={stockIn}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  required
                  step="any"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Used:</label>
                <input
                  type="number"
                  value={used}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  required
                  step="any"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Wasted:</label>
                <input
                  type="number"
                  value={wasted}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  required
                  step="any"
                />
              </div>

              {/* Dropdown untuk Ingredient Type */}
              <div>
                <label className="block font-semibold mb-1">Ingredient Type:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                >
                  <option value="RAW">RAW</option>

                </select>
              </div>
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowRawModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
