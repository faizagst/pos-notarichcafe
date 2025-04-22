'use client';
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import toast from "react-hot-toast";

interface Bundle {
  id: number;
  name: string;
  image: string;
  price: number;
  Status: string;
  bundleCompositions: {
    id: number;
    menu: { id: number; name: string; price: number };
    amount: number; // ditambahkan properti amount
  }[];
  description?: string;
  category: string;
  isActive: boolean;
  discounts: DiscountInfo[];
  modifiers: Modifier[];
}

interface MenuOption {
  id: number;
  name: string;
  price: number;
}

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

interface Modifier {
  modifier: {
    id: number;
    name: string;
  };
}

const BundlesPage: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

  // State untuk search bar berdasarkan kategori
  const [searchCategory, setSearchCategory] = useState<string>("");

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bundles');
      const data = await res.json();
      setBundles(data);
    } catch (err) {
      console.error(err);
      setError('Gagal mengambil data bundle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bundle ini?')) return;
    try {
      const res = await fetch(`/api/bundles/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBundles();
      } else {
        const data = await res.json();
        toast.error(data.message || 'Gagal menghapus bundle');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menghapus bundle');
    }
  };

  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    if (!confirm("Apakah Anda yakin ingin mengubah status?")) return;
    try {
      const res = await fetch(`/api/bundles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });      
      if (!res.ok) {
        throw new Error("Failed to toggle status");
      }
      fetchBundles();
      toast.success(newStatus ? "Bundle berhasil diaktifkan" : "Bundle berhasil dinonaktifkan");
    } catch (error) {
      console.error("Error toggling discount status:", error);
    }
  };

  // Filter bundles berdasarkan kategori (property 'category')
  const displayedBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(searchCategory.toLowerCase()) 
  );

  return (
    <div className="p-10 mt-[65px]" >
      <h1 className="text-2xl font-bold mb-4">Daftar Bundles</h1>
      <button
        onClick={() => setShowAddModal(true)}
        className="mb-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
      >
        Tambah Bundle
      </button>

      {/* Search Bar untuk kategori */}
      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder="Cari nama bundle..."
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="w-1/3 p-2 border border-gray-300 rounded"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Bundle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu yang Digunakan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Diskon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifiers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedBundles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    data tidak ditemukan
                  </td>
                </tr>
              ) : (
                displayedBundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td className="px-6 py-4">
                      <img src={bundle.image} alt={bundle.name} className="w-16 h-16 object-cover rounded" />
                    </td>
                    <td className="px-6 py-4">{bundle.name}</td>
                    <td className="px-6 py-4">
                      {bundle.bundleCompositions && bundle.bundleCompositions.length > 0
                        ? bundle.bundleCompositions
                          .map((comp) => `${comp.menu.name} (${comp.amount})`)
                          .join(' + ')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">{bundle.price}</td>
                    <td className="px-6 py-4">{bundle.Status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    {bundle.discounts && bundle.discounts.length > 0 ? (
                      bundle.discounts.map((d, index) => (
                        <span key={d.discount.id}>
                          {d.discount.name} ({d.discount.value}
                          {d.discount.type === "PERCENTAGE" ? "%" : ""})
                          {index < bundle.discounts.length - 1 && ", "}
                        </span>
                      ))
                    ) : (
                      "Tidak ada diskon"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {bundle.modifiers && bundle.modifiers.length > 0 ? (
                      bundle.modifiers.map((mod, index) => (
                        <span key={mod.modifier.id}>
                          {mod.modifier.name}
                          {index < bundle.modifiers.length - 1 && ", "}
                        </span>
                      ))
                    ) : (
                      "Tidak ada modifier"
                    )}
                  </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedBundle(bundle);
                          setShowEditModal(true);
                        }}
                        className="bg-blue-500 hover:bg-green-600 text-white py-1 px-3 rounded mr-2 mb-2"
                      >
                        Edit
                      </button>
                      <button
                      onClick={() => handleDelete(bundle.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2 mb-2"
                    >
                      Delete
                    </button>
                      {bundle.isActive ? (
                        <button
                          onClick={() => bundle.id && handleToggleStatus(bundle.id, false)}
                          className="bg-gray-400 text-white hover:bg-gray-500 px-3 py-1 rounded mr-2 mb-2"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          onClick={() => bundle.id && handleToggleStatus(bundle.id, true)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2 mb-2"
                        >
                          Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {showAddModal && (
        <AddBundleModal onClose={() => setShowAddModal(false)} onBundleAdded={fetchBundles} />
      )}
      {showEditModal && selectedBundle && (
        <EditBundleModal
          bundle={selectedBundle}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBundle(null);
          }}
          onBundleUpdated={fetchBundles}
        />
      )}
    </div>
  );
};

export default BundlesPage;


/// ----------------- AddBundleModal Component -----------------


interface BundleMenuRow {
  menuId: number;
  amount: number;
}

interface MenuOption {
  id: number;
  name: string;
  price: number;
}

interface Discount {
  id: number;
  name: string;
  scope: string;
  value: number;
  type: string;
}

interface Modifier {
  id: number;
  name: string;
}

interface AddBundleModalProps {
  onClose: () => void;
  onBundleAdded: () => void;
}

const AddBundleModal: React.FC<AddBundleModalProps> = ({ onClose, onBundleAdded }) => {
  const [bundleName, setBundleName] = useState('');
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [menuRows, setMenuRows] = useState<BundleMenuRow[]>([]);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');
  const [modifierOptions, setModifierOptions] = useState<Modifier[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fungsi untuk menambah baris menu di AddBundleModal
  const addRowAddModal = () => {
    setMenuRows([...menuRows, { menuId: 0, amount: 0 }]);
  };

  // Fungsi untuk update baris menu di AddBundleModal
  const updateRowAddModal = (index: number, field: keyof BundleMenuRow, value: number) => {
    const newRows = [...menuRows];
    newRows[index][field] = value;
    setMenuRows(newRows);
  };

  // Fungsi untuk menghapus baris menu di AddBundleModal
  const removeRowAddModal = (index: number) => {
    const newRows = menuRows.filter((_, i) => i !== index);
    setMenuRows(newRows);
  };

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch('/api/hitungCost?type=NORMAL');
        const data = await res.json();
        setMenuOptions(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchMenus();
  }, []);

  useEffect(() => {
    async function fetchDiscounts() {
      try {
        const res = await fetch('/api/discount');
        const data = await res.json();
        const menuDiscounts = data.filter((d: Discount) => d.scope === 'MENU');
        setAvailableDiscounts(menuDiscounts);
      } catch (err) {
        console.error(err);
      }
    }
    fetchDiscounts();
  }, []);

  useEffect(() => {
    async function fetchModifiers() {
      try {
        const res = await fetch('/api/modifier');
        const data = await res.json();
        setModifierOptions(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchModifiers();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('name', bundleName);
    formData.append('price', bundlePrice.toString());
    formData.append('type', 'BUNDLE');
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    // Kirim menuRows sebagai JSON string
    formData.append('includedMenus', JSON.stringify(menuRows));
    if (selectedDiscountId) {
      formData.append('discountId', selectedDiscountId);
    }
    if (selectedModifierIds.length > 0) {
      formData.append('modifierIds', JSON.stringify(selectedModifierIds));
    }

    try {
      const res = await fetch('/api/addBundle', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal membuat bundle');
      } else {
        onBundleAdded();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat membuat bundle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Tambah Bundle</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Nama Bundle:</label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Harga Bundle:</label>
            <input
              type="number"
              value={bundlePrice}
              onChange={(e) => setBundlePrice(Number(e.target.value))}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Deskripsi Bundle:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Gambar Bundle:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {/* Bagian dinamis untuk memilih menu dan jumlahnya */}
          <div className="mb-4">
            <label className="block mb-1">Pilih Menu untuk Bundle:</label>
            {menuRows.map((row, index) => (
              <div key={index} className="flex gap-4 items-center mb-4">
                <select
                  value={row.menuId}
                  onChange={(e) =>
                    updateRowAddModal(index, "menuId", parseInt(e.target.value))
                  }
                  required
                  className="flex-1 p-2 border border-gray-300 rounded"
                >
                  <option value={0}>Pilih Menu</option>
                  {menuOptions.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name} - Rp {menu.price}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) =>
                    updateRowAddModal(index, "amount", parseFloat(e.target.value))
                  }
                  required
                  className="p-2 border border-gray-300 rounded w-24"
                />
                <button
                  type="button"
                  onClick={() => removeRowAddModal(index)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRowAddModal}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Add Menu
            </button>
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Modifier (Opsional):</label>
            {modifierOptions.length > 0 ? (
              modifierOptions.map((modifier) => (
                <div key={modifier.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    value={modifier.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (e.target.checked) {
                        setSelectedModifierIds((prev) => [...prev, id]);
                      } else {
                        setSelectedModifierIds((prev) =>
                          prev.filter((m) => m !== id)
                        );
                      }
                    }}
                    checked={selectedModifierIds.includes(modifier.id)}
                    className="mr-2"
                  />
                  <span>{modifier.name}</span>
                </div>
              ))
            ) : (
              <p>Loading modifiers...</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Diskon (Opsional):</label>
            <select
              value={selectedDiscountId}
              onChange={(e) => setSelectedDiscountId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">--Tidak ada Diskon--</option>
              {availableDiscounts.map((discount) => (
                <option key={discount.id} value={discount.id}>
                  {discount.name}{' '}
                  {discount.type === 'PERCENTAGE'
                    ? `(${discount.value}%)`
                    : `(Rp ${discount.value})`}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="mr-4 px-4 py-2 border rounded">
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {loading ? 'Memproses...' : 'Tambah Bundle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditBundleModalProps {
  bundle: Bundle;
  onClose: () => void;
  onBundleUpdated: () => void;
}

const EditBundleModal: React.FC<EditBundleModalProps> = ({ bundle, onClose, onBundleUpdated }) => {
  const [bundleName, setBundleName] = useState(bundle.name);
  const [bundlePrice, setBundlePrice] = useState<number>(bundle.price);
  const [description, setDescription] = useState(bundle.description || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [menuRows, setMenuRows] = useState<BundleMenuRow[]>(
    bundle.bundleCompositions.map(comp => ({ menuId: comp.menu.id, amount: comp.amount }))
  );
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  // Inisialisasi dengan diskon yang sudah ada (jika ada)
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>(
    bundle.discounts.length > 0 ? bundle.discounts[0].discount.id.toString() : ""
  );

  const [modifierOptions, setModifierOptions] = useState<Modifier[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>(
    bundle.modifiers.map((mod) => mod.modifier.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fungsi untuk update baris menu di EditBundleModal
  const updateRowEditModal = (index: number, field: keyof BundleMenuRow, value: number) => {
    const newRows = [...menuRows];
    newRows[index][field] = value;
    setMenuRows(newRows);
  };

  // Fungsi untuk menambah baris menu di EditBundleModal
  const addRowEditModal = () => {
    setMenuRows([...menuRows, { menuId: 0, amount: 0 }]);
  };

  // Fungsi untuk menghapus baris menu di EditBundleModal
  const removeRowEditModal = (index: number) => {
    const newRows = menuRows.filter((_, i) => i !== index);
    setMenuRows(newRows);
  };

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch('/api/hitungCost?type=NORMAL');
        const data = await res.json();
        setMenuOptions(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchMenus();
  }, []);

  useEffect(() => {
    async function fetchDiscounts() {
      try {
        const res = await fetch('/api/discount');
        const data = await res.json();
        const menuDiscounts = data.filter((d: Discount) => d.scope === 'MENU');
        setAvailableDiscounts(menuDiscounts);
      } catch (err) {
        console.error(err);
      }
    }
    fetchDiscounts();
  }, []);

  useEffect(() => {
    async function fetchModifiers() {
      try {
        const res = await fetch('/api/modifier');
        const data = await res.json();
        setModifierOptions(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchModifiers();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('id', bundle.id.toString());
    formData.append('name', bundleName);
    formData.append('price', bundlePrice.toString());
    formData.append('description', description);
    formData.append('category', bundle.category);
    formData.append('Status', bundle.Status);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    formData.append('includedMenus', JSON.stringify(menuRows));
    if (selectedDiscountId) {
      formData.append('discountId', selectedDiscountId);
    }
    if (selectedModifierIds.length > 0) {
      formData.append('modifierIds', JSON.stringify(selectedModifierIds));
    }

    try {
      const res = await fetch(`/api/bundles/${bundle.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal mengupdate bundle');
      } else {
        onBundleUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat mengupdate bundle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Bundle</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Nama Bundle:</label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Harga Bundle:</label>
            <input
              type="number"
              value={bundlePrice}
              onChange={(e) => setBundlePrice(Number(e.target.value))}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Deskripsi Bundle:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Gambar Bundle (opsional):</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {/* Bagian dinamis untuk memilih menu dan jumlahnya */}
          <div className="mb-4">
            <label className="block mb-1">Pilih Menu untuk Bundle:</label>
            {menuRows.map((row, index) => (
              <div key={index} className="flex gap-4 items-center mb-4">
                <select
                  value={row.menuId}
                  onChange={(e) =>
                    updateRowEditModal(index, "menuId", parseInt(e.target.value))
                  }
                  required
                  className="flex-1 p-2 border border-gray-300 rounded"
                >
                  <option value={0}>Pilih Menu</option>
                  {menuOptions.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name} - Rp {menu.price}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) =>
                    updateRowEditModal(index, "amount", parseFloat(e.target.value))
                  }
                  required
                  className="p-2 border border-gray-300 rounded w-24"
                />
                <button
                  type="button"
                  onClick={() => removeRowEditModal(index)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRowEditModal}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Add Menu
            </button>
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Modifier (Opsional):</label>
            {modifierOptions.length > 0 ? (
              modifierOptions.map((modifier) => (
                <div key={modifier.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    value={modifier.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (e.target.checked) {
                        setSelectedModifierIds((prev) => [...prev, id]);
                      } else {
                        setSelectedModifierIds((prev) =>
                          prev.filter((m) => m !== id)
                        );
                      }
                    }}
                    checked={selectedModifierIds.includes(modifier.id)}
                    className="mr-2"
                  />
                  <span>{modifier.name}</span>
                </div>
              ))
            ) : (
              <p>Loading modifiers...</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block mb-1">Pilih Diskon (Opsional):</label>
            <select
              value={selectedDiscountId}
              onChange={(e) => setSelectedDiscountId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {selectedDiscountId === "" && (
                <option value="">--Tidak ada Diskon--</option>
              )}
              {availableDiscounts.map((discount) => (
                <option key={discount.id} value={discount.id}>
                  {discount.name}{" "}
                  {discount.type === "PERCENTAGE"
                    ? `(${discount.value}%)`
                    : `(Rp ${discount.value})`}
                </option>
              ))}
            </select>

          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="mr-4 px-4 py-2 border rounded">
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {loading ? 'Memproses...' : 'Update Bundle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { AddBundleModal, EditBundleModal };

