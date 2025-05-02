"use client";

import { useEffect, useState, FormEvent } from "react";
import toast from "react-hot-toast";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: string;
  expiredDate: string;
  employeeStatus: string;
}

interface RoleEmployee {
  id: number;
  name: string;
}

export default function EmployeeSlots() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<RoleEmployee[]>([]);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [expiredDate, setExpiredDate] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employee");
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Error fetching employees");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/employeeRoles");
      if (!res.ok) {
        throw new Error("Failed to fetch roles");
      }
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Fetch roles error:", error);
      toast.error("Error fetching roles");
    }
  };

  const handleOpenForm = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setEmail(employee.email || "");
      setPhone(employee.phone?.replace("+62", "") || "");
      setRoleId(employee.roleId.toString());
      setExpiredDate(employee.expiredDate.slice(0, 10));
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId("");
    setExpiredDate("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = "/api/employee";
    const method = editingEmployee ? "PUT" : "POST";
    const payload = {
      id: editingEmployee?.id,
      firstName,
      lastName,
      email,
      phone: `+62${phone}`,
      roleId,
      expiredDate,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Jika berhasil, panggil fetchEmployees dan tutup form
        await fetchEmployees();
        setShowForm(false);

        // Tampilkan toast sukses
        if (editingEmployee) {
          toast.success("Employee updated successfully!");
        } else {
          toast.success("Employee invited successfully!");
        }
      } else {
        // Jika gagal, ambil pesan error dari server (opsional)
        const data = await res.json();
        toast.error(data.error || "Failed to submit employee data");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch("/api/employee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await fetchEmployees();
        toast.success("Employee deleted successfully!");
      } else {
        toast.error("Failed to delete employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Error deleting employee");
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-black">
      <div className={`flex-1 p-8 }`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">Employee Slots</h1>
          <button onClick={() => handleOpenForm()} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Add Employee
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Role</th>
                <th className="border p-2">Expiration Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border">
                  <td className="border p-2">
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td className="border p-2">{emp.email || "-"}</td>
                  <td className="border p-2">{emp.phone || "-"}</td>
                  <td className="border p-2">{emp.roleName || "-"}</td>
                  <td className="border p-2">{new Date(emp.expiredDate).toLocaleDateString()}</td>
                  <td className="border p-2">
                    <button onClick={() => handleOpenForm(emp)} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md mr-2">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed top-0 right-0 w-full md:w-1/3 h-screen bg-white shadow-xl p-6 z-50 overflow-auto">
            <h2 className="text-xl font-bold mb-4">{editingEmployee ? "Edit Employee" : "New Employee"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded p-2" required />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded p-2" required  />
              </div>

              <div>
                <label className="block mb-1 font-medium">Phone</label>
                <div className="flex">
                  <span className="p-2 bg-gray-100 border rounded-l">+62</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))} className="flex-1 border rounded-r p-2" placeholder="8123456789" pattern="[0-9]{9,13}" required />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Role</label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full border rounded p-2" required>
                  <option value="">- Select Role -</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium">Expiration Date</label>
                <input type="date" value={expiredDate} onChange={(e) => setExpiredDate(e.target.value)} className="w-full border rounded p-2" required />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  {editingEmployee ? "Update" : "Invite"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
