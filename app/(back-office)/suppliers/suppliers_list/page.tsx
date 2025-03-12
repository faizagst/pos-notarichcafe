"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type Supplier = {
  id_supplier: number;
  nama: string;
  kontak: string;
  alamat: string;
};

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newSupplier, setNewSupplier] = useState({ nama: "", kontak: "", alamat: "" });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/supplier/supplier_list");
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Gagal mengambil data supplier:", error);
    }
  };

  const handleAddSupplier = async () => {
    setErrorMessage(""); // Reset error sebelum mencoba menambah

    if (!newSupplier.nama || !newSupplier.kontak || !newSupplier.alamat) {
      setErrorMessage("Semua kolom harus diisi!");
      return;
    }

    if (!/^\d{10,15}$/.test(newSupplier.kontak)) {
      setErrorMessage("No Handphone harus angka dan minimal 10 digit!");
      return;
    }

    try {
      const res = await fetch("/api/supplier/add_supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      const result = await res.json();
      if (res.ok) {
        fetchSuppliers();
        setOpen(false);
        setNewSupplier({ nama: "", kontak: "", alamat: "" });
      } else {
        setErrorMessage(result.error || "Gagal menambahkan supplier!");
      }
    } catch (error) {
      console.error("Error menambahkan supplier:", error);
      setErrorMessage("Terjadi kesalahan, coba lagi.");
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Nama,Kontak,Alamat", ...suppliers.map((s) => `${s.nama},${s.kontak},${s.alamat}`)].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "supplier_list.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white px-10 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Supplier List</h1>
          <div className="flex space-x-2">
            <Button className="bg-blue-500 text-white px-4 py-2" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button className="bg-blue-600 text-white px-4 py-2" onClick={() => setOpen(true)}>
              Create Supplier
            </Button>
          </div>
        </header>

        <main className="flex-1 py-4 px-6 bg-white shadow-md rounded-lg">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Nama</th>
                <th className="p-3 text-left">No Handphone</th>
                <th className="p-3 text-left">Alamat</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id_supplier} className="border-b">
                  <td className="p-3">{supplier.nama}</td>
                  <td className="p-3">{supplier.kontak}</td>
                  <td className="p-3">{supplier.alamat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        {open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-semibold mb-4">Create Supplier</h2>

              {errorMessage && (
                <div className="bg-red-100 text-red-700 p-2 rounded-md mb-3 text-sm">
                  {errorMessage}
                </div>
              )}

              <input
                type="text"
                placeholder="Nama Supplier"
                className="w-full mb-2 p-2 border rounded"
                value={newSupplier.nama}
                onChange={(e) => setNewSupplier({ ...newSupplier, nama: e.target.value })}
              />
              <input
                type="text"
                placeholder="No Handphone"
                className="w-full mb-2 p-2 border rounded"
                value={newSupplier.kontak}
                onChange={(e) => setNewSupplier({ ...newSupplier, kontak: e.target.value })}
              />
              <input
                type="text"
                placeholder="Alamat"
                className="w-full mb-2 p-2 border rounded"
                value={newSupplier.alamat}
                onChange={(e) => setNewSupplier({ ...newSupplier, alamat: e.target.value })}
              />

              <div className="flex justify-between mt-4">
                <Button className="bg-gray-500 text-white px-4 py-2" onClick={() => setOpen(false)}>
                  Back
                </Button>
                <Button className="bg-blue-600 text-white px-4 py-2" onClick={handleAddSupplier}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
