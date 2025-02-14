'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

// Employee Type
type Employee = {
  employee_name: string;
  username: string;
  password: string;
  role: string;
};

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_name: '',
    username: '',
    password: '',
    role: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employee/employee_list');
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const res = await fetch('/api/employee/add_employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEmployee)
      });
  
      const data = await res.json(); // Ambil response dari server
  
      if (res.ok) {
        console.log('Success:', data);
        fetchEmployees();
        setOpen(false);
        setNewEmployee({ employee_name: '', username: '', password: '', role: '' });
      } else {
        console.error('Failed to add employee:', data.error, data.details);
        alert(`Error: ${data.error}\nDetails: ${data.details}`);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('An unexpected error occurred. Check the console for details.');
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    employee.username.toLowerCase().includes(search.toLowerCase()) ||
    employee.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white px-10 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Employee List</h1>
          <div className="flex space-x-2">
            <Button className="bg-blue-500 text-white px-4 py-2">Export</Button>
            <Button className="bg-blue-600 text-white px-4 py-2" onClick={() => setOpen(true)}>Add Employee</Button>
          </div>
        </header>

        <div className="flex items-center px-6 py-2 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full p-2 pl-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <main className="flex-1 py-4 px-6 bg-white shadow-md rounded-lg">
          <div className="overflow-y-auto max-h-[400px] border rounded-lg shadow-sm">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="p-3 text-left">Employee Name</th>
                  <th className="p-3 text-left">Username</th>
                  <th className="p-3 text-left">Password</th>
                  <th className="p-3 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{employee.employee_name || '-'}</td>
                      <td className="p-3">{employee.username || '-'}</td>
                      <td className="p-3">{employee.password ? '******' : '-'}</td> {/* Menyembunyikan password */}
                      <td className="p-3">{employee.role || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* Modal for adding employee */}
        {open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-semibold mb-4">Add Employee</h2>
              <input
                type="text"
                placeholder="Employee Name"
                className="w-full mb-2 p-2 border rounded"
                value={newEmployee.employee_name}
                onChange={(e) => setNewEmployee({ ...newEmployee, employee_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Username"
                className="w-full mb-2 p-2 border rounded"
                value={newEmployee.username}
                onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full mb-2 p-2 border rounded"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
              />
              <input
                type="text"
                placeholder="Role"
                className="w-full mb-2 p-2 border rounded"
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <Button className="bg-gray-500 text-white" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 text-white" onClick={handleAddEmployee}>Add</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
