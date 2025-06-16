'use client'
import { useEffect, useState } from 'react';
import toast from "react-hot-toast";

type Category = {
  id: number;
  name: string;
  description?: string;
  ingredientsCount: number;
  };

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // State untuk search bar
  const [searchTerm, setSearchTerm] = useState<string>("");


  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingredientCategory');
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError("Gagal mengambil data kategori");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete action
  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus kategori ini?');
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/ingredientCategory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        toast.success("Kategori berhasil dihapus!")
      } else {
        const errorData = await res.json();
        toast.error(`Gagal menghapus kategori: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Handle add category submit (dipanggil dari modal)
  const handleAddCategory = async (name: string, description: string) => {
    try {
      const res = await fetch('/api/ingredientCategory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data  = await res.json()
      if (res.ok) {
        toast.success("Category berhasil dibuat!");
        setShowAddModal(false);
        fetchCategories();
      } else {
        toast.error(data.error || 'Gagal menambahkan kategori');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  // Handle edit category submit (dipanggil dari modal)
  const handleEditCategory = async (id: number, name: string, description: string) => {
    try {
      const res = await fetch(`/api/ingredientCategory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        
        toast.success("Category Berhasil di edit");
        setSelectedCategory(null);
        fetchCategories();
      } else {
        toast.error(data.error || 'Gagal mengedit kategori');
      }
    } catch (error) {
      console.error('Error editing category:', error);
    }
  };

  // Filter kategori berdasarkan searchTerm
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 mt-[65px]" >
      <h1 className="text-2xl font-bold mb-4">Daftar Kategori Ingredient</h1>
      <button 
        onClick={() => setShowAddModal(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-8"
      >
        Add Ingredient Category
      </button>

      {/* Search Bar */}
      <div className="mb-4 flex justify-end">
        <input
          type="text"
          placeholder="Search Category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3 p-2 border border-gray-300 rounded"
        />
      </div>


      {loading ? (
        <p>Loading...</p>
      ): error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : filteredCategories.length === 0 ? (
        <p className="text-center text-[#979797]">{searchTerm ? "Data tidak ditemukan" : "Belum ada kategori."}</p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff'
          }}
        >
          <thead style={{ backgroundColor: '#f2f2f2' }}>
            <tr>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nama Kategori</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Deskripsi</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Jumlah Ingredient</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((category, index) => (
              <tr key={category.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{category.name}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{category.description}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {category.ingredientsCount} ingredient
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowEditModal(true);
                    }}
                    style={{
                      backgroundColor: '#2196F3',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    style={{
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
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

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <AddCategoryForm
            onSubmit={(name, description) => handleAddCategory(name, description)}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {showEditModal && selectedCategory && (
        <Modal onClose={() => { setShowEditModal(false); setSelectedCategory(null); }}>
          <EditCategoryForm
            category={selectedCategory}
            onSubmit={(name, description) => handleEditCategory(selectedCategory.id, name, description)}
            onCancel={() => { setShowEditModal(false); setSelectedCategory(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// Komponen Modal dengan desain modern
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: '#fff',
          width: '350px',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

// Komponen Form untuk Menambahkan Kategori dengan input nama dan deskripsi
function AddCategoryForm({ onSubmit, onCancel }: { onSubmit: (name: string, description: string) => void; onCancel: () => void; }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    onSubmit(name, description);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: "15px" }}>Tambah Kategori Ingredient</h2>
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Nama Kategori:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <label style={{ display: "block", marginBottom: "5px" }}>Deskripsi:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <div style={{ textAlign: "right" }}>
        <button
          type="submit"
          style={{
            backgroundColor: "#4CAF50",
            color: "#fff",
            border: "none",
            padding: "10px 15px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Tambah
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: "#ccc",
            color: "#000",
            border: "none",
            padding: "10px 15px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
        >
          Batal
        </button>
      </div>
    </form>
  );
}

// Komponen Form untuk Mengedit Kategori dengan input nama dan deskripsi
function EditCategoryForm({ category, onSubmit, onCancel }: { category: Category; onSubmit: (name: string, description: string) => void; onCancel: () => void; }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    onSubmit(name, description);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: "15px" }}>Edit Kategori Ingredient</h2>
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Nama Kategori:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <label style={{ display: "block", marginBottom: "5px" }}>Deskripsi:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <div style={{ textAlign: "right" }}>
        <button
          type="submit"
          style={{
            backgroundColor: "#2196F3",
            color: "#fff",
            border: "none",
            padding: "10px 15px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: "#ccc",
            color: "#000",
            border: "none",
            padding: "10px 15px",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "10px",
          }}
        >
          Batal
        </button>
      </div>
    </form>
  );
}
