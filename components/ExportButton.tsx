// components/ExportButton.tsx
"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Definisi tipe untuk konfigurasi kolom
interface ColumnConfig {
  header: string;
  key: string;
}

// Definisi tipe props dengan generik untuk data
interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnConfig[];
  fileName: string;
}

export const ExportButton = <T extends Record<string, unknown>>({
  data,
  columns,
  fileName,
}: ExportButtonProps<T>) => {
  const [open, setOpen] = useState(false);

  const toggleDropdown = () => {
    setOpen(!open);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    setOpen(false);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const headers = [columns.map((col) => col.header)];
    const body = data.map((row) =>
      columns.map((col) => String(row[col.key] ?? ""))
    );
    autoTable(doc, {
      head: headers,
      body: body,
    });
    doc.save(`${fileName}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow"
      >
        Export
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md z-10">
          <button
            onClick={exportToPdf}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export Excel
          </button>
        </div>
      )}
    </div>
  );
};