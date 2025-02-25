'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, Edit, Trash } from 'lucide-react';

// Employee Type
type Employee = {
  id: number;
  employee_name: string;
  username: string;
  password?: string;
  role: string;
};

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee>({
    id: 0,
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
      const res = await fetch('/api/employee');
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const res = await fetch('/api/employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedEmployee)
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Success:', data);
        fetchEmployees();
        setModalOpen(false);
        setSelectedEmployee({ id: 0, employee_name: '', username: '', password: '', role: '' });
      } else {
        console.error('Failed to add employee:', data.error, data.details);
        alert(`Error: ${data.error}\nDetails: ${data.details}`);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('An unexpected error occurred. Check the console for details.');
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      const res = await fetch('/api/employee', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedEmployee)
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Success:', data);
        fetchEmployees();
        setModalOpen(false);
        setSelectedEmployee({ id: 0, employee_name: '', username: '', password: '', role: '' });
        setEditMode(false);
      } else {
        console.error('Failed to update employee:', data.error, data.details);
        alert(`Error: ${data.error}\nDetails: ${data.details}`);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('An unexpected error occurred. Check the console for details.');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        const res = await fetch('/api/employee', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id })
        });

        const data = await res.json();

        if (res.ok) {
          console.log('Deleted:', data);
          fetchEmployees();
        } else {
          console.error('Failed to delete employee:', data.error, data.details);
          alert(`Error: ${data.error}\nDetails: ${data.details}`);
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('An unexpected error occurred. Check the console for details.');
      }
    }
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditMode(true);
    setModalOpen(true);
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
          <Button
            className="bg-blue-600 text-white"
            onClick={() => {
              setSelectedEmployee({ id: 0, employee_name: '', username: '', password: '', role: '' });
              setModalOpen(true);
              setEditMode(false);
            }}
          >
            Add Employee
          </Button>
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
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="border-b">
                <th className="p-3 text-left">Employee Name</th>
                <th className="p-3 text-left">Username</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{employee.employee_name || '-'}</td>
                    <td className="p-3">{employee.username || '-'}</td>
                    <td className="p-3">{employee.role || '-'}</td>
                    <td className="p-3 text-center flex justify-center space-x-2">
                      <Button className="bg-yellow-500 text-white p-2" onClick={() => handleEditClick(employee)}>
                        <Edit size={16} />
                      </Button>
                      <Button className="bg-red-500 text-white p-2" onClick={() => handleDeleteEmployee(employee.id)}>
                        <Trash size={16} />
                      </Button>
                    </td>
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
        </main>

        {/* Modal for Add/Edit Employee */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 relative">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                {editMode ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Employee Name"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedEmployee.employee_name}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, employee_name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedEmployee.username}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, username: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedEmployee.password || ''}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, password: e.target.value })}
                />
                <select
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedEmployee.role}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, role: e.target.value })}
                >
                  <option value="">Select Role</option>
                  <option value="manajer">manajer</option>
                  <option value="kasir">kasir</option>
                </select>
                <button
                  onClick={editMode ? handleUpdateEmployee : handleAddEmployee}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editMode ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
