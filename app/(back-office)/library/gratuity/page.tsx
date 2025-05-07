'use client'
import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";

type Gratuity = {
  id?: number;
  name: string;
  value: number; // Dalam persentase, misal 5 untuk 5%
  isActive?: boolean;
};

const EditGratuityModal: React.FC<{
  gratuity: Gratuity;
  onClose: () => void;
  onSubmit: (gratuity: Gratuity) => void;
}> = ({ gratuity, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Gratuity>(gratuity);

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
      <h2 className="text-xl font-bold mb-4">Edit Gratuity</h2>
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
          <label className="mr-2">Value (%):</label>
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

const AddGratuityModal: React.FC<{
  onClose: () => void;
  onSubmit: (gratuity: Gratuity) => void;
}> = ({ onClose, onSubmit }) => {
  const initialData: Gratuity = {
    name: '',
    value: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState<Gratuity>(initialData);

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
      <h2 className="text-xl font-bold mb-4">Add Gratuity</h2>
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
          <label className="mr-2">Value (%):</label>
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

const GetGratuity: React.FC = () => {
  const [gratuities, setGratuities] = useState<Gratuity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGratuity, setSelectedGratuity] = useState<Gratuity | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchGratuities();
  }, []);


  const fetchGratuities = async () => {
    try {
      const res = await fetch('/api/gratuity');
      const data = await res.json();
      setGratuities(data);
    } catch (error) {
      console.error('Error fetching gratuities:', error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus gratuity ini?')) return; 
    try {
      const res = await fetch(`/api/gratuity/${id}`, {
        method: 'DELETE',
      });
  
      if (!res.ok) throw new Error('Failed to delete');
      toast.success("Berhasil hapus gratuity!");
      fetchGratuities();
    } catch (error) {
      console.error('Error deleting gratuity:', error);
    }
  };
  

  const handleEdit = (gratuity: Gratuity) => {
    setSelectedGratuity(gratuity);
    setShowEditModal(true);
  };

  const handleUpdateGratuity = async (updatedGratuity: Gratuity) => {
    try {
      if (!updatedGratuity.id) return;
  
      const res = await fetch(`/api/gratuity/${updatedGratuity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGratuity),
      });
  
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Gratuity name already exists') {
          toast.error("Nama gratuity sudah digunakan!");
        } else {
          toast.error("Gagal edit gratuity!");
        }
        return;
      }
  
      toast.success("Berhasil edit gratuity!");
      setShowEditModal(false);
      setSelectedGratuity(null);
      fetchGratuities();
    } catch (error) {
      console.error('Error updating gratuity:', error);
    }
  };
  

  const handleAddGratuity = async (newGratuity: Gratuity) => {
    try {
      const res = await fetch('/api/gratuity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newGratuity),
      });
  
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Gratuity name already exists') {
          toast.error("Nama gratuity sudah digunakan!");
        } else {
          toast.error("Gagal buat gratuity!");
        }
        return;
      }
  
  
      toast.success("Berhasil buat gratuity!");
      setShowAddModal(false);
      fetchGratuities();
    } catch (error) {
      console.error('Error adding gratuity:', error);
    }
  };
  
  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    try {
      const res = await fetch(`/api/gratuity/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });
  
      if (!res.ok) throw new Error('Failed to toggle status');
      toast.success(
        newStatus ? 'Grautuity berhasil diaktifkan!' : 'Gratuity berhasil dinonaktifkan!'
      );
      fetchGratuities();
    } catch (error) {
      console.error("Error toggling gratuity status:", error);
    }
  };
  

  // Filter data gratuity berdasarkan input search
  const filteredGratuities = gratuities.filter((gratuity) =>
    gratuity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-10 mt-[65px]">
      <h1 className="text-2xl font-bold mb-4">Gratuities</h1>
      <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Gratuity
        </button>

      {/* Search bar*/}
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
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">No</th>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Value (%)</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGratuities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredGratuities.map((gratuity, index) => (
                  <tr key={gratuity.id} className="text-center">
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">{gratuity.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{gratuity.value}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {gratuity.isActive ? (
                        <span className="text-green-500 font-bold">Yes</span>
                      ) : (
                        <span className="text-red-500 font-bold">No</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 space-x-2">
                      <button
                        onClick={() => handleEdit(gratuity)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                      onClick={() => gratuity.id !== undefined && handleDelete(gratuity.id!)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Delete
                    </button>
                      {gratuity.isActive ? (
                        <button
                          onClick={() => gratuity.id && handleToggleStatus(gratuity.id, false)}
                          className="bg-gray-400 text-white hover:bg-gray-500 px-3 py-1 rounded"
                        >
                          Nonaktif
                        </button>
                      ) : (
                        <button
                          onClick={() => gratuity.id && handleToggleStatus(gratuity.id, true)}
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
      {showEditModal && selectedGratuity && (
        <EditGratuityModal
          gratuity={selectedGratuity}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGratuity(null);
          }}
          onSubmit={handleUpdateGratuity}
        />
      )}
      {showAddModal && (
        <AddGratuityModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddGratuity}
        />
      )}
     
    </div>
  );
};

export default GetGratuity;
