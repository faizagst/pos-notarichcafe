// manager/library/diskon/page.tsx
'use client'
import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";

type Discount = {
  id?: number;
  name: string;
  type: 'PERCENTAGE' | 'NORMAL';
  scope: 'MENU' | 'TOTAL';
  value: number;
  isActive?: boolean;
};

const EditDiscountModal: React.FC<{
  discount: Discount;
  onClose: () => void;
  onSubmit: (discount: Discount) => void;
}> = ({ discount, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Discount>(discount);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value'
          ? Number(value)
          : name === 'isActive'
          ? e.target.value === 'true'
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg">
      <h2 className="text-xl font-bold mb-4">Edit Discount</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mr-2">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Type:</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Scope:</label>
          <select
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="MENU">MENU</option>
            <option value="TOTAL">TOTAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Value:</label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Active:</label>
          <select
            name="isActive"
            value={formData.isActive ? 'true' : 'false'}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="submit"
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

const AddDiscountModal: React.FC<{
  onClose: () => void;
  onSubmit: (discount: Discount) => void;
}> = ({ onClose, onSubmit }) => {
  const initialData: Discount = {
    name: '',
    type: 'PERCENTAGE',
    scope: 'MENU',
    value: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState<Discount>(initialData);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value'
          ? Number(value)
          : name === 'isActive'
          ? e.target.value === 'true'
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg">
      <h2 className="text-xl font-bold mb-4">Add Discount</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mr-2">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Type:</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Scope:</label>
          <select
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="MENU">MENU</option>
            <option value="TOTAL">TOTAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Value:</label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Active:</label>
          <select
            name="isActive"
            value={formData.isActive ? 'true' : 'false'}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="submit"
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

const GetDiscount: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch('/api/discount');
      const data = await res.json();
      setDiscounts(data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus discount ini?')) return;
    try {
      const res = await fetch(`/api/discount/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete discount');
      toast.success("Berhasil hapus diskon!");
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };
  

  const handleEdit = (discount: Discount) => {
    setSelectedDiscount(discount);
    setShowEditModal(true);
  };

  const handleUpdateDiscount = async (updatedDiscount: Discount) => {
    try {
      if (!updatedDiscount.id) return;
      const res = await fetch(`/api/discount/${updatedDiscount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDiscount),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Discount name already exists in this scope') {
          toast.error("Nama diskon sudah digunakan!");
        } else {
          toast.error("Gagal edit diskon!");
        }
        return;
      }
      toast.success("Berhasil edit diskon!");
      setShowEditModal(false);
      setSelectedDiscount(null);
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating discount:', error);
    }
  };
  

const handleAddDiscount = async (newDiscount: Discount) => {
  try {
    const res = await fetch('/api/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDiscount),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === 'Discount name already exists in this scope') {
        toast.error("Nama diskon sudah digunakan!");
      } else {
        toast.error("Gagal membuat diskon!");
      }
      return;
    }
    toast.success("Berhasil buat diskon!");
    setShowAddModal(false);
    fetchDiscounts();
  } catch (error) {
    console.error('Error adding discount:', error);
  }
};


const handleToggleStatus = async (id: number, newStatus: boolean) => {
  try {
    const res = await fetch(`/api/discount/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newStatus }),
    });
    if (!res.ok) throw new Error('Failed to toggle status');
    toast.success(
      newStatus ? 'Diskon berhasil diaktifkan!' : 'Diskon berhasil dinonaktifkan!'
    );
    fetchDiscounts();
  } catch (error) {
    console.error("Error toggling discount status:", error);
  }
};


  // Filter data diskon berdasarkan input search
  const filteredDiscounts = discounts.filter((discount) =>
    discount.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Discounts</h1>
      <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Discount
        </button>
      
      {/* Search bar*/}
      <div className="mb-4 flex justify-end">
        <input
          type="text"
          placeholder="Search Discounts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3 p-2 border border-gray-300 rounded"
        />
      </div> 

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto max-h-[400px] border border-gray-300">
          <table className="min-w-full">
            <thead className='sticky top-0 z-50'>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">No</th>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Value</th>
                <th className="border border-gray-300 px-4 py-2">Type</th>
                <th className="border border-gray-300 px-4 py-2">Scope</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-4 py-2 text-center">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount, index) => (
                  <tr key={discount.id} className="text-center">
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">{discount.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{discount.value}</td>
                    <td className="border border-gray-300 px-4 py-2">{discount.type}</td>
                    <td className="border border-gray-300 px-4 py-2">{discount.scope}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {discount.isActive ? (
                        <span className="text-green-500 font-bold">Yes</span>
                      ) : (
                        <span className="text-red-500 font-bold">No</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 space-x-2">
                      <button
                        onClick={() => handleEdit(discount)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                      onClick={() => discount.id !== undefined && handleDelete(discount.id!)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Delete
                    </button>
                      {discount.isActive ? (
                        <button
                          onClick={() => discount.id && handleToggleStatus(discount.id, false)}
                          className="bg-gray-400 text-white hover:bg-gray-500 px-3 py-1 rounded"
                        >
                          Nonaktif
                        </button>
                      ) : (
                        <button
                          onClick={() => discount.id && handleToggleStatus(discount.id, true)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
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
      {showEditModal && selectedDiscount && (
        <EditDiscountModal
          discount={selectedDiscount}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDiscount(null);
          }}
          onSubmit={handleUpdateDiscount}
        />
      )}
      {showAddModal && (
        <AddDiscountModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddDiscount}
        />
      )}
     
    </div>
  );
};

export default GetDiscount;
