"use client";

import { useState, useEffect, FormEvent } from "react";

// 1. Import React Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface EmployeeAssigned {
  id: number;
  firstName: string;
  lastName: string;
}

interface RoleEmployee {
  id: number;
  name: string;
  employees: EmployeeAssigned[];

  // Field JSON opsional (dari DB), agar kita bisa memuat data existing
  appPermissions?: AppPermissions;
  backofficePermissions?: BackofficePermissions;
}

// Struktur data untuk App Permissions
interface AppPermissions {
  cashier: boolean;
  layoutCafe: boolean;
  riwayat: boolean;
  reservasi: boolean;
}

// Struktur data untuk Backoffice Permissions dengan parent checkbox
interface BackofficePermissions {
  // Single checkbox (tanpa children)
  viewDashboard: boolean;

  // View Reports
  viewReportsParent: boolean;
  viewReports: {
    sales: boolean;
    transactions: boolean;
  };

  // View Menu
  viewMenuParent: boolean;
  viewMenu: {
    daftarMenu: boolean;
    kategoriMenu: boolean;
  };

  // View Library
  viewLibraryParent: boolean;
  viewLibrary: {
    bundles: boolean;
    taxes: boolean;
    gratuity: boolean;
    discount: boolean;
  };

  // View Modifier
  viewModifierParent: boolean;
  viewModifier: {
    modifier: boolean;
    category: boolean;
  };

  // View Ingredients
  viewIngredientsParent: boolean;
  viewIngredients: {
    ingredientsLibrary: boolean;
    ingredientsCategory: boolean;
    recipes: boolean;
  };

  // View Inventory
  viewInventoryParent: boolean;
  viewInventory: {
    summary: boolean;
    supplier: boolean;
    purchaseOrder: boolean;
  };

  // View Rekap
  viewRekapParent: boolean;
  viewRekap: {
    stokCafe: boolean;
    stokGudang: boolean;
    penjualan: boolean;
  };

  // View Employees
  viewEmployeesParent: boolean;
  viewEmployees: {
    employeeSlots: boolean;
    employeeAccess: boolean;
  };
}

export default function EmployeeAccess() {
  const [roles, setRoles] = useState<RoleEmployee[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Kontrol side panel form (Create/Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // false = create, true = edit
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  // Role Name
  const [roleName, setRoleName] = useState("");

  // App Permissions
  const [appPermissions, setAppPermissions] = useState<AppPermissions>({
    cashier: false,
    layoutCafe: false,
    riwayat: false,
    reservasi: false,
  });

  // Backoffice Permissions
  const [backofficePermissions, setBackofficePermissions] = useState<BackofficePermissions>({
    viewDashboard: false,
    viewReportsParent: false,
    viewReports: { sales: false, transactions: false },
    viewMenuParent: false,
    viewMenu: { daftarMenu: false, kategoriMenu: false },
    viewLibraryParent: false,
    viewLibrary: { bundles: false, taxes: false, gratuity: false, discount: false },
    viewModifierParent: false,
    viewModifier: { modifier: false, category: false },
    viewIngredientsParent: false,
    viewIngredients: { ingredientsLibrary: false, ingredientsCategory: false, recipes: false },
    viewInventoryParent: false,
    viewInventory: { summary: false, supplier: false, purchaseOrder: false },
    viewRekapParent: false,
    viewRekap: { stokCafe: false, stokGudang: false, penjualan: false },
    viewEmployeesParent: false,
    viewEmployees: { employeeSlots: false, employeeAccess: false },
  });

  // Kontrol side panel privileges (read-only)
  const [showPrivileges, setShowPrivileges] = useState(false);
  const [privilegesRole, setPrivilegesRole] = useState<RoleEmployee | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  // Ambil data roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/employeeRoles");
      if (!res.ok) {
        throw new Error("Failed to fetch roles");
      }
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    }
  };

  // ===================== CREATE =====================
  const openCreateForm = () => {
    setShowForm(true);
    setIsEditMode(false);
    setEditingRoleId(null);

    // Reset form
    setRoleName("");
    setAppPermissions({
      cashier: false,
      layoutCafe: false,
      riwayat: false,
      reservasi: false,
    });
    setBackofficePermissions({
      viewDashboard: false,
      viewReportsParent: false,
      viewReports: { sales: false, transactions: false },
      viewMenuParent: false,
      viewMenu: { daftarMenu: false, kategoriMenu: false },
      viewLibraryParent: false,
      viewLibrary: { bundles: false, taxes: false, gratuity: false, discount: false },
      viewModifierParent: false,
      viewModifier: { modifier: false, category: false },
      viewIngredientsParent: false,
      viewIngredients: { ingredientsLibrary: false, ingredientsCategory: false, recipes: false },
      viewInventoryParent: false,
      viewInventory: { summary: false, supplier: false, purchaseOrder: false },
      viewRekapParent: false,
      viewRekap: { stokCafe: false, stokGudang: false, penjualan: false },
      viewEmployeesParent: false,
      viewEmployees: { employeeSlots: false, employeeAccess: false },
    });
  };

  // ===================== EDIT =====================
  const openEditForm = (role: RoleEmployee) => {
    setShowForm(true);
    setIsEditMode(true);
    setEditingRoleId(role.id);

    // Muat data existing
    setRoleName(role.name);
    setAppPermissions(
      role.appPermissions || {
        cashier: false,
        layoutCafe: false,
        riwayat: false,
        reservasi: false,
      }
    );
    setBackofficePermissions(
      role.backofficePermissions || {
        viewDashboard: false,
        viewReportsParent: false,
        viewReports: { sales: false, transactions: false },
        viewMenuParent: false,
        viewMenu: { daftarMenu: false, kategoriMenu: false },
        viewLibraryParent: false,
        viewLibrary: { bundles: false, taxes: false, gratuity: false, discount: false },
        viewModifierParent: false,
        viewModifier: { modifier: false, category: false },
        viewIngredientsParent: false,
        viewIngredients: { ingredientsLibrary: false, ingredientsCategory: false, recipes: false },
        viewInventoryParent: false,
        viewInventory: { summary: false, supplier: false, purchaseOrder: false },
        viewRekapParent: false,
        viewRekap: { stokCafe: false, stokGudang: false, penjualan: false },
        viewEmployeesParent: false,
        viewEmployees: { employeeSlots: false, employeeAccess: false },
      }
    );
  };

  // ===================== PRIVILEGES (READ-ONLY) =====================
  const openPrivileges = (role: RoleEmployee) => {
    setPrivilegesRole(role);
    setShowPrivileges(true);
  };
  const closePrivileges = () => {
    setPrivilegesRole(null);
    setShowPrivileges(false);
  };

  // ===================== SUBMIT (CREATE/EDIT) =====================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: roleName,
        appPermissions,
        backofficePermissions,
      };

      let method = "POST";
      let url = "/api/employeeRoles";
      if (isEditMode && editingRoleId) {
        method = "PUT";
        (payload as any).id = editingRoleId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit role");
      }

      if (isEditMode) {
        toast.success("Role updated successfully!");
      } else {
        toast.success("Role created successfully!");
      }

      await fetchRoles();
      setShowForm(false);
    } catch (error: any) {
      console.error("Error submitting role:", error);
      toast.error(error.message || "Error submitting role");
    }
  };

  // ===================== TOGGLE PARENT CHECKBOX =====================
  const toggleReportsParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewReportsParent: checked,
      viewReports: {
        sales: checked,
        transactions: checked,
      },
    }));
  };

  const toggleMenuParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewMenuParent: checked,
      viewMenu: {
        daftarMenu: checked,
        kategoriMenu: checked,
      },
    }));
  };

  const toggleLibraryParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewLibraryParent: checked,
      viewLibrary: {
        bundles: checked,
        taxes: checked,
        gratuity: checked,
        discount: checked,
      },
    }));
  };

  const toggleModifierParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewModifierParent: checked,
      viewModifier: { modifier: checked, category: checked },
    }));
  };

  const toggleIngredientsParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewIngredientsParent: checked,
      viewIngredients: {
        ingredientsLibrary: checked,
        ingredientsCategory: checked,
        recipes: checked,
      },
    }));
  };

  const toggleInventoryParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewInventoryParent: checked,
      viewInventory: {
        summary: checked,
        supplier: checked,
        purchaseOrder: checked,
      },
    }));
  };

  const toggleRekapParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewRekapParent: checked,
      viewRekap: {
        stokCafe: checked,
        stokGudang: checked,
        penjualan: checked,
      },
    }));
  };

  const toggleEmployeesParent = (checked: boolean) => {
    setBackofficePermissions((prev) => ({
      ...prev,
      viewEmployeesParent: checked,
      viewEmployees: {
        employeeSlots: checked,
        employeeAccess: checked,
      },
    }));
  };

  return (
    <div className="flex min-h-screen bg-white text-black">
      {/* Toastify container */}
      <ToastContainer />

      <div className={`flex-1 p-8 }`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Employee Access</h1>
          <button onClick={openCreateForm} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Create Employee Role
          </button>
        </div>

        {/* Tabel: Role Name, Employees Assigned, Access */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Role Name</th>
                <th className="border p-2">Employees Assigned</th>
                <th className="border p-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="border p-2">{role.name}</td>
                  <td className="border p-2">
                    {role.employees && role.employees.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {role.employees.map((emp) => (
                          <li key={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">No employees</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {/* Tombol "Privileges" */}
                    <button onClick={() => openPrivileges(role)} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 mr-2">
                      Privileges
                    </button>

                    {/* Tombol "Edit Privileges" */}
                    <button onClick={() => openEditForm(role)} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200">
                      Edit Privileges
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Form (Create/Edit Role) */}
      {showForm && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50 overflow-auto">
          <h2 className="text-xl font-bold mb-4">{isEditMode ? "Edit Role" : "Create Employee Role"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block mb-1 font-medium">Role Name</label>
              <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            {/* App Permissions */}
            <fieldset className="border rounded p-3">
              <legend className="font-semibold">App Permissions</legend>
              <div className="flex flex-col mt-2 space-y-2">
                <label>
                  <input type="checkbox" checked={appPermissions.cashier} onChange={(e) => setAppPermissions({ ...appPermissions, cashier: e.target.checked })} /> Cashier
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.layoutCafe} onChange={(e) => setAppPermissions({ ...appPermissions, layoutCafe: e.target.checked })} /> Layout Cafe
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.riwayat} onChange={(e) => setAppPermissions({ ...appPermissions, riwayat: e.target.checked })} /> Riwayat
                </label>
                <label>
                  <input type="checkbox" checked={appPermissions.reservasi} onChange={(e) => setAppPermissions({ ...appPermissions, reservasi: e.target.checked })} /> Reservasi
                </label>
              </div>
            </fieldset>

            {/* Backoffice Permissions */}
            <fieldset className="border rounded p-3">
              <legend className="font-semibold">Backoffice Permissions</legend>

              {/* View Dashboard */}
              <div className="mt-2">
                <label>
                  <input
                    type="checkbox"
                    checked={backofficePermissions.viewDashboard}
                    onChange={(e) =>
                      setBackofficePermissions({
                        ...backofficePermissions,
                        viewDashboard: e.target.checked,
                      })
                    }
                  />{" "}
                  View Dashboard
                </label>
              </div>

              {/* View Reports */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewReportsParent} onChange={(e) => toggleReportsParent(e.target.checked)} /> <span className="font-medium">View Reports</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewReports.sales}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewReports: {
                            ...prev.viewReports,
                            sales: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Sales
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewReports.transactions}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewReports: {
                            ...prev.viewReports,
                            transactions: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Transactions
                  </label>
                </li>
              </ul>

              {/* View Menu */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewMenuParent} onChange={(e) => toggleMenuParent(e.target.checked)} /> <span className="font-medium">View Menu</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewMenu.daftarMenu}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewMenu: {
                            ...prev.viewMenu,
                            daftarMenu: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Daftar Menu
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewMenu.kategoriMenu}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewMenu: {
                            ...prev.viewMenu,
                            kategoriMenu: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Kategori Menu
                  </label>
                </li>
              </ul>

              {/* View Library */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewLibraryParent} onChange={(e) => toggleLibraryParent(e.target.checked)} /> <span className="font-medium">View Library</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.bundles}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            bundles: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Bundles
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.taxes}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            taxes: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Taxes
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.gratuity}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            gratuity: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Gratuity
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewLibrary.discount}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewLibrary: {
                            ...prev.viewLibrary,
                            discount: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Discount
                  </label>
                </li>
              </ul>

              {/* View Modifier */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewModifierParent} onChange={(e) => toggleModifierParent(e.target.checked)} /> <span className="font-medium">View Modifier</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewModifier.modifier}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewModifier: {
                            ...prev.viewModifier,
                            modifier: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Modifier
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewModifier.category}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewModifier: {
                            ...prev.viewModifier,
                            category: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Category
                  </label>
                </li>
              </ul>

              {/* View Ingredients */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewIngredientsParent} onChange={(e) => toggleIngredientsParent(e.target.checked)} /> <span className="font-medium">View Ingredients</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.ingredientsLibrary}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            ingredientsLibrary: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Ingredients Library
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.ingredientsCategory}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            ingredientsCategory: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Ingredients Category
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewIngredients.recipes}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewIngredients: {
                            ...prev.viewIngredients,
                            recipes: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Recipes
                  </label>
                </li>
              </ul>

              {/* View Inventory */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewInventoryParent} onChange={(e) => toggleInventoryParent(e.target.checked)} /> <span className="font-medium">View Inventory</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.summary}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            summary: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Summary
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.supplier}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            supplier: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Supplier
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewInventory.purchaseOrder}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewInventory: {
                            ...prev.viewInventory,
                            purchaseOrder: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Purchase Order
                  </label>
                </li>
              </ul>

              {/* View Rekap */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewRekapParent} onChange={(e) => toggleRekapParent(e.target.checked)} /> <span className="font-medium">View Rekap</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.stokCafe}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            stokCafe: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Stok Cafe
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.stokGudang}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            stokGudang: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Stok Gudang
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewRekap.penjualan}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewRekap: {
                            ...prev.viewRekap,
                            penjualan: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Rekap Penjualan
                  </label>
                </li>
              </ul>

              {/* View Employees */}
              <div className="mt-2">
                <label>
                  <input type="checkbox" checked={backofficePermissions.viewEmployeesParent} onChange={(e) => toggleEmployeesParent(e.target.checked)} /> <span className="font-medium">View Employees</span>
                </label>
              </div>
              <ul className="ml-6 list-disc space-y-1 mt-1">
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewEmployees.employeeSlots}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewEmployees: {
                            ...prev.viewEmployees,
                            employeeSlots: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Employee Slots
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      type="checkbox"
                      checked={backofficePermissions.viewEmployees.employeeAccess}
                      onChange={(e) =>
                        setBackofficePermissions((prev) => ({
                          ...prev,
                          viewEmployees: {
                            ...prev.viewEmployees,
                            employeeAccess: e.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Employee Access
                  </label>
                </li>
              </ul>
            </fieldset>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsEditMode(false);
                  setEditingRoleId(null);
                }}
                className="px-4 py-2 rounded-md border"
              >
                Cancel
              </button>
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                {isEditMode ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Panel Privileges (READ-ONLY) */}
      {showPrivileges && privilegesRole && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50 overflow-auto">
          <h2 className="text-xl font-bold mb-4">Privileges for: {privilegesRole.name}</h2>

          {/* App Permissions */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">App Permissions</h3>
            {privilegesRole.appPermissions ? (
              <ul className="list-disc list-inside ml-4">
                {privilegesRole.appPermissions.cashier && <li>Cashier</li>}
                {privilegesRole.appPermissions.layoutCafe && <li>Layout Cafe</li>}
                {privilegesRole.appPermissions.riwayat && <li>Riwayat</li>}
                {privilegesRole.appPermissions.reservasi && <li>Reservasi</li>}
              </ul>
            ) : (
              <p className="text-gray-500">No App Permissions</p>
            )}
          </div>

          {/* Backoffice Permissions */}
          <div>
            <h3 className="font-semibold mb-2">Backoffice Permissions</h3>
            {privilegesRole.backofficePermissions ? (
              <div className="space-y-2 text-sm ml-4">
                {/* View Dashboard */}
                {privilegesRole.backofficePermissions.viewDashboard && <div>- View Dashboard</div>}

                {/* View Reports */}
                {(privilegesRole.backofficePermissions.viewReports.sales || privilegesRole.backofficePermissions.viewReports.transactions) && (
                  <div>
                    - View Reports:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewReports.sales && <li>Sales</li>}
                      {privilegesRole.backofficePermissions.viewReports.transactions && <li>Transactions</li>}
                    </ul>
                  </div>
                )}

                {/* View Menu */}
                {(privilegesRole.backofficePermissions.viewMenu.daftarMenu || privilegesRole.backofficePermissions.viewMenu.kategoriMenu) && (
                  <div>
                    - View Menu:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewMenu.daftarMenu && <li>Daftar Menu</li>}
                      {privilegesRole.backofficePermissions.viewMenu.kategoriMenu && <li>Kategori Menu</li>}
                    </ul>
                  </div>
                )}

                {/* View Library */}
                {(privilegesRole.backofficePermissions.viewLibrary.bundles ||
                  privilegesRole.backofficePermissions.viewLibrary.taxes ||
                  privilegesRole.backofficePermissions.viewLibrary.gratuity ||
                  privilegesRole.backofficePermissions.viewLibrary.discount) && (
                  <div>
                    - View Library:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewLibrary.bundles && <li>Bundles</li>}
                      {privilegesRole.backofficePermissions.viewLibrary.taxes && <li>Taxes</li>}
                      {privilegesRole.backofficePermissions.viewLibrary.gratuity && <li>Gratuity</li>}
                      {privilegesRole.backofficePermissions.viewLibrary.discount && <li>Discount</li>}
                    </ul>
                  </div>
                )}

                {/* View Modifier */}
                {(privilegesRole.backofficePermissions.viewModifier.modifier || privilegesRole.backofficePermissions.viewModifier.category) && (
                  <div>
                    - View Modifier:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewModifier.modifier && <li>Modifier</li>}
                      {privilegesRole.backofficePermissions.viewModifier.category && <li>Category</li>}
                    </ul>
                  </div>
                )}

                {/* View Ingredients */}
                {(privilegesRole.backofficePermissions.viewIngredients.ingredientsLibrary || privilegesRole.backofficePermissions.viewIngredients.ingredientsCategory || privilegesRole.backofficePermissions.viewIngredients.recipes) && (
                  <div>
                    - View Ingredients:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewIngredients.ingredientsLibrary && <li>Ingredients Library</li>}
                      {privilegesRole.backofficePermissions.viewIngredients.ingredientsCategory && <li>Ingredients Category</li>}
                      {privilegesRole.backofficePermissions.viewIngredients.recipes && <li>Recipes</li>}
                    </ul>
                  </div>
                )}

                {/* View Inventory */}
                {(privilegesRole.backofficePermissions.viewInventory.summary || privilegesRole.backofficePermissions.viewInventory.supplier || privilegesRole.backofficePermissions.viewInventory.purchaseOrder) && (
                  <div>
                    - View Inventory:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewInventory.summary && <li>Summary</li>}
                      {privilegesRole.backofficePermissions.viewInventory.supplier && <li>Supplier</li>}
                      {privilegesRole.backofficePermissions.viewInventory.purchaseOrder && <li>Purchase Order</li>}
                    </ul>
                  </div>
                )}

                {/* View Rekap */}
                {(privilegesRole.backofficePermissions.viewRekap.stokCafe || privilegesRole.backofficePermissions.viewRekap.stokGudang || privilegesRole.backofficePermissions.viewRekap.penjualan) && (
                  <div>
                    - View Rekap:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewRekap.stokCafe && <li>Rekap Stok Cafe</li>}
                      {privilegesRole.backofficePermissions.viewRekap.stokGudang && <li>Rekap Stok Gudang</li>}
                      {privilegesRole.backofficePermissions.viewRekap.penjualan && <li>Rekap Penjualan</li>}
                    </ul>
                  </div>
                )}

                {/* View Employees */}
                {(privilegesRole.backofficePermissions.viewEmployees.employeeSlots || privilegesRole.backofficePermissions.viewEmployees.employeeAccess) && (
                  <div>
                    - View Employees:
                    <ul className="list-disc list-inside ml-4">
                      {privilegesRole.backofficePermissions.viewEmployees.employeeSlots && <li>Employee Slots</li>}
                      {privilegesRole.backofficePermissions.viewEmployees.employeeAccess && <li>Employee Access</li>}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No Backoffice Permissions</p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={() => setShowPrivileges(false)} className="px-4 py-2 border rounded hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
