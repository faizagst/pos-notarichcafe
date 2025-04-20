"use client";
import { useState, useEffect, FormEvent, useRef } from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

type Gudang = {
  id: number;
  ingredientId: number; // field baru
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stock: number;
  stockMin: number;
  unit: string;
  isArchive: boolean;   // field baru
};

export default function GudangTable() {
  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedGudang, setSelectedGudang] = useState<Gudang | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGudang, setFilteredGudang] = useState<Gudang[]>([]);

  const router = useRouter();
  const wastedRef = useRef<HTMLInputElement>(null);

  // Fungsi untuk mengambil data gudang dari API
  const fetchGudang = async () => {
    try {
      const res = await fetch("/api/stockRoom");
      if (!res.ok) {
        throw new Error("Gagal mengambil data gudang.");
      }
      const data = await res.json();
      setGudangList(data);
      setFilteredGudang(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGudang();
  }, []);

  useEffect(() => {
    const filtered = gudangList.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGudang(filtered);
  }, [searchQuery, gudangList]);

  // Fungsi untuk menghapus gudang
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ingridient ini?, ingridient di daftar ingridient juag akan terhapus ")) return;
    try {
      const res = await fetch(`/api/stockRoom/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Gagal menghapus data gudang.");
      }
      // Mengupdate state gudangList setelah penghapusan
      setGudangList(gudangList.filter((item) => item.id !== id));
      toast.success("Ingredient berhasil dihapus!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus data gudang.");
    }
  };

  // Fungsi untuk membuka modal edit
  const handleEdit = (id: number) => {
    const gudangItem = gudangList.find((i) => i.id === id);
    if (gudangItem) {
      setSelectedGudang(gudangItem);
    }
  };

  // Fungsi untuk menutup modal
  const handleModalClose = () => {
    setSelectedGudang(null);
  };

  // Fungsi untuk submit perubahan pada modal edit
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGudang) return;
    try {
      // Ganti endpoint jadi /api/gudang
      const res = await fetch(`/api/stockRoom/${selectedGudang.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedGudang),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Data gudang berhasil diedit!");
        // Perbarui state gudangList dengan data yang dikembalikan dari API
        setGudangList(
          gudangList.map((item) =>
            item.id === selectedGudang.id ? data.gudang : item
          )
        );
        setSelectedGudang(null);
      } else {
        toast.error(data.message || "Gagal mengupdate data gudang.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengupdate data gudang.");
    }
  };

  // Fungsi untuk reset daily stock (sesuaikan jika masih diperlukan)
  const handleResetDailyStock = async () => {
    const confirmed = confirm("Apakah Anda yakin ingin mereset stok harian?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/rekap/stockRoom", {
        method: "POST",
      });
      const result = await res.json();
      toast.success(result.message);
      if (res.ok) {
        router.push("/recapNotarich/stockInventory");
      }
    } catch (error) {
      console.error("Error resetting daily stock:", error);
    }
  };

  // Filter gudang yang stock akhir <= stockMin
  const lowStockItems = gudangList.filter(
    (item) => item.stock <= item.stockMin
  );

  return (
    <div
      className="p-10 mt-[65px]"
    >
      <h1 className="text-2xl font-bold mb-4">Daftar Gudang</h1>

      {/* Ganti link jika Anda punya halaman khusus untuk tambah data gudang */}
      {/* <Link href="/manager/addGudang">
        <p className="text-blue-500 hover:underline pb-4">
          + Tambah Data Gudang
        </p>
      </Link> */}

      <div className="p-0">
        {lowStockItems.length > 0 ? (
          lowStockItems.map((item) => (
            <p key={item.id} className="text-lg font-semibold text-red-600">
              Stock untuk {item.name} {item.stock} {item.unit} (Minimum:{" "}
              {item.stockMin} {item.unit})
            </p>
          ))
        ) : (
          <p className="text-green-600">Semua stok dalam keadaan baik.</p>
        )}
      </div>

      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder="Cari data gudang..."
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
        <div className="overflow-x-auto max-h-[456px]">
          <table className="min-w-full border-collapse bg-white border border-gray-200">
            <thead className="sticky top-0 bg-white z-50">
              <tr style={{ height: '60px' }}>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredient ID
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Order
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wasted
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Min
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Akhir
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>

                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGudang.map((item, index) => (
                <tr key={item.id} className="text-center"
                style={{ height: '56px' }}>
                  <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.ingredientId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.start}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.stockIn}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.used}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.wasted}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.stockMin}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>

                  {/* <td className="px-8 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(item.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td> */}
                </tr>
              ))}
              {filteredGudang.length === 0 && (
                <tr>
                  <td className="py-2 px-4 border-b text-center" colSpan={12}>
                    Tidak ada data gudang.
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
          className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-200"
        >
          Rekap Stock Gudang
        </button>
      </div>

      <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md mt-4">
        <AlertTriangle className="text-yellow-700 w-5 h-5 mr-2 mt-1" />
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-yellow-900">Perhatian:</span>{" "}
          Tekan tombol{" "}
          <span className="font-semibold text-red-600">Rekap Stock Gudang</span>{" "}
          hanya pada saat <span className="font-semibold">closing cafe</span>,
          untuk menyimpan rekap pengeluaran stok gudang hari ini.
        </p>
      </div>

      {/* Modal Edit Gudang */}
      {selectedGudang && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 40px)" }}
          >
            <h2 className="text-xl font-bold mb-4">Edit Gudang</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block font-medium mb-1">Ingredient ID:</label>
                <input
                  type="number"
                  value={selectedGudang.ingredientId}
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
                      ingredientId: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
                <p className="text-red-500 mt-1 text-sm">
                  <strong>Ubah IngredientId jika Ingridientid Tidak Sama dengan Id di Daftar Gudang!!</strong>
                </p>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Name:</label>
                <input
                  type="text"
                  value={selectedGudang.name}
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Start:</label>
                <input
                  type="number"
                  value={selectedGudang.start}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Stock In:</label>
                <input
                  type="number"
                  value={
                    isNaN(selectedGudang.stockIn) ? "" : selectedGudang.stockIn
                  }
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
                      stockIn: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Used:</label>
                <input
                  type="number"
                  value={selectedGudang.used}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                  step="any"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Wasted:</label>
                <input
                  type="number"
                  defaultValue={selectedGudang?.wasted}
                  ref={wastedRef}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setSelectedGudang((prev) =>
                      prev
                        ? {
                          ...prev,
                          wasted: isNaN(value) ? 0 : value,
                        }
                        : prev
                    );
                  }}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Stock Min:</label>
                <input
                  type="number"
                  value={selectedGudang.stockMin}
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
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
                  value={selectedGudang.unit}
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
                      unit: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">isActive:</label>
                <select
                  value={selectedGudang.isArchive ? "true" : "false"}
                  onChange={(e) =>
                    setSelectedGudang({
                      ...selectedGudang,
                      isArchive: e.target.value === "true",
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="false">Habis</option>
                  <option value="true">Tersedia</option>
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleModalClose}
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
