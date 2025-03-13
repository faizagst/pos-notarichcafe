"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText } from "lucide-react";

type Supplier = {
  id_supplier: number;
  nama: string;
  kontak: string;
  alamat: string;
  is_deleted: boolean;
};

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [modalKey, setModalKey] = useState(Date.now());
  const [newSupplier, setNewSupplier] = useState<Supplier>({
    id_supplier: 0,
    nama: "",
    kontak: "",
    alamat: "",
    is_deleted: false,
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/supplier/supplier_list");
      if (!res.ok) throw new Error("Gagal mengambil data supplier!");
      const data: Supplier[] = await res.json();
      setSuppliers(data.filter((s) => !s.is_deleted));
    } catch (error) {
      console.error("Error fetching suppliers:", (error as Error).message);
    }
  };

  const handleDelete = async (id_supplier: number) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan supplier ini?")) return;
    try {
      const res = await fetch(`/api/supplier/delete_supplier?id_supplier=${id_supplier}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menonaktifkan supplier!");
      fetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", (error as Error).message);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? "/api/supplier/update_supplier" : "/api/supplier/add_supplier";
      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      if (!res.ok) throw new Error("Gagal menyimpan supplier!");

      setOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", (error as Error).message);
    }
  };

  const exportToCSV = () => {
    const header = "ID,Nama,Kontak,Alamat\n";
    const csvData = suppliers.map(s => `${s.id_supplier},${s.nama},${s.kontak},${s.alamat}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + csvData;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "suppliers_list.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white px-10 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Supplier List</h1>
          <div className="flex space-x-3">
            <Button className="bg-blue-600 text-white px-4 py-2" onClick={() => {
              setOpen(true);
              setEditMode(false);
              setNewSupplier({ id_supplier: 0, nama: "", kontak: "", alamat: "", is_deleted: false });
              setModalKey(Date.now());
            }}>
              Create Supplier
            </Button>
            <Button className="bg-green-600 text-white px-4 py-2" onClick={exportToCSV}>
              <FileText size={16} className="mr-2" /> Export CSV
            </Button>
          </div>
        </header>

        <main className="flex-1 py-4 px-6 bg-white shadow-md rounded-lg">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">No Handphone</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id_supplier} className="border-b">
                  <td className="p-3">{supplier.nama}</td>
                  <td className="p-3">{supplier.kontak}</td>
                  <td className="p-3">{supplier.alamat}</td>
                  <td className="p-3 flex space-x-2">
                    <Button className="bg-yellow-500 text-white px-3 py-1" onClick={() => {
                      setNewSupplier(supplier);
                      setEditMode(true);
                      setOpen(true);
                      setModalKey(Date.now());
                    }}>
                      <Pencil size={16} />
                    </Button>
                    <Button className="bg-red-500 text-white px-3 py-1" onClick={() => handleDelete(supplier.id_supplier)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      {open && (
        <div key={modalKey} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">{editMode ? "Edit Supplier" : "Create Supplier"}</h2>
            <input type="text" placeholder="Name" className="border p-2 w-full mb-2" value={newSupplier.nama} onChange={(e) => setNewSupplier({ ...newSupplier, nama: e.target.value })} />
            <input type="text" placeholder="No Handphone" className="border p-2 w-full mb-2" value={newSupplier.kontak} onChange={(e) => setNewSupplier({ ...newSupplier, kontak: e.target.value })} />
            <input type="text" placeholder="Address" className="border p-2 w-full mb-4" value={newSupplier.alamat} onChange={(e) => setNewSupplier({ ...newSupplier, alamat: e.target.value })} />
            <div className="flex justify-end space-x-2">
              <Button className="bg-gray-500 text-white px-4 py-2" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 text-white px-4 py-2" onClick={handleSubmit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
