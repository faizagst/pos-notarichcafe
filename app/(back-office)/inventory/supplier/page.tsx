'use client'
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import toast from "react-hot-toast";

interface Supplier {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin untuk delete supplier?')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      toast.error('Error deleting supplier');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  // Filter data supplier berdasarkan input search
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Supplier</h1>
      <button
        className="mb-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => setShowCreateModal(true)}
      >
        Add Supplier
      </button>

      {/* Search bar*/}
      <div className="mb-4 flex justify-end">
        <input
          type="text"
          placeholder="Search Suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-1/3 p-2 border border-gray-300 rounded"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-4 py-2 text-center">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-4 py-2">{supplier.id}</td>
                      <td className="px-4 py-2">{supplier.name}</td>
                      <td className="px-4 py-2">{supplier.address}</td>
                      <td className="px-4 py-2">{supplier.phone}</td>
                      <td className="px-4 py-2">{supplier.email}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                          onClick={() => handleEdit(supplier)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      )}
      {showCreateModal && (
        <CreateSupplierModal
          onClose={() => setShowCreateModal(false)}
          onSupplierCreated={fetchSuppliers}
        />
      )}
      {showEditModal && selectedSupplier && (
        <EditSupplierModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSupplier(null);
          }}
          onSupplierUpdated={fetchSuppliers}
        />
      )}
    </div>
  );
};



// CreateSupplierModal Component
interface CreateSupplierModalProps {
  onClose: () => void;
  onSupplierCreated: () => void;
}

const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({ onClose, onSupplierCreated }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create supplier');
      } else {
        toast.success('Supplier created successfully');
        onSupplierCreated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError('Error creating supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create Supplier</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Phone:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              {loading ? "Processing..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// EditSupplierModal Component
interface EditSupplierModalProps {
  supplier: Supplier;
  onClose: () => void;
  onSupplierUpdated: () => void;
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({ supplier, onClose, onSupplierUpdated }) => {
  const [name, setName] = useState(supplier.name);
  const [address, setAddress] = useState(supplier.address);
  const [phone, setPhone] = useState(supplier.phone);
  const [email, setEmail] = useState(supplier.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update supplier");
      } else {
        toast.success("Supplier updated successfully");
        onSupplierUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("Error updating supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Supplier</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Phone:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              {loading ? "Processing..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuppliersPage;
