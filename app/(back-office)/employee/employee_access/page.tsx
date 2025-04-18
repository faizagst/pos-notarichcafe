"use client";

import { useState, useEffect, FormEvent } from "react";
import { backofficePermissionTree } from "@/lib/backofficePermissionTree";
import { appPermissionTree } from "@/lib/appPermissionTree";
import toast from "react-hot-toast";

interface EmployeeAssigned {
  id: number;
  name: string;
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
  menu: boolean;
  riwayat: boolean;
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

  // View Inventory
  viewInventoryParent: boolean;
  viewInventory: {
    summary: boolean;
    supplier: boolean;
    purchaseOrder: boolean;
  };

  // View Library
  viewLibraryParent: boolean;
  viewLibrary: {
    bundlePackage: boolean;
    discounts: boolean;
    taxes: boolean;
    gratuity: boolean;
  };

  // View Modifier
  viewModifierParent: boolean;
  viewModifier: {
    modifiersLibrary: boolean;
    modifierCategory: boolean;
  };

  // View Ingredients
  viewIngredientsParent: boolean;
  viewIngredients: {
    ingredientsLibrary: boolean;
    ingredientsCategory: boolean;
    recipes: boolean;
  };

  // View Menu
  viewMenuParent: boolean;
  viewMenu: {
    menuList: boolean;
    menuCategory: boolean;
  };

  // View Recap
  viewRecapParent: boolean;
  viewRecap: {
    stockCafe: boolean;
    stockInventory: boolean;
  };

  // View Employees
  viewEmployeesParent: boolean;
  viewEmployees: {
    employeeSlots: boolean;
    employeeAccess: boolean;
  };
}

const DEFAULT_APP_PERMISSIONS: AppPermissions = {
  cashier: false,
  menu: false,
  riwayat: false,
};

export const DEFAULT_BACKOFFICE_PERMISSIONS: BackofficePermissions = {
  viewDashboard: false,

  viewReportsParent: false,
  viewReports: {
    sales: false,
    transactions: false,
  },

  viewInventoryParent: false,
  viewInventory: {
    summary: false,
    supplier: false,
    purchaseOrder: false,
  },

  viewLibraryParent: false,
  viewLibrary: {
    bundlePackage: false,
    discounts: false,
    taxes: false,
    gratuity: false,
  },

  viewModifierParent: false,
  viewModifier: {
    modifiersLibrary: false,
    modifierCategory: false,
  },

  viewIngredientsParent: false,
  viewIngredients: {
    ingredientsLibrary: false,
    ingredientsCategory: false,
    recipes: false,
  },

  viewMenuParent: false,
  viewMenu: {
    menuList: false,
    menuCategory: false,
  },

  viewRecapParent: false,
  viewRecap: {
    stockCafe: false,
    stockInventory: false,
  },

  viewEmployeesParent: false,
  viewEmployees: {
    employeeSlots: false,
    employeeAccess: false,
  },
};


function getMergedAppPermissions(p?: AppPermissions): AppPermissions {
  return { ...DEFAULT_APP_PERMISSIONS, ...p };
}

export function getMergedBackofficePermissions(p?: Partial<BackofficePermissions>): BackofficePermissions {
  return {
    ...DEFAULT_BACKOFFICE_PERMISSIONS,
    ...p,
    viewReports: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewReports, ...(p?.viewReports || {}) },
    viewInventory: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewInventory, ...(p?.viewInventory || {}) },
    viewLibrary: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewLibrary, ...(p?.viewLibrary || {}) },
    viewModifier: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewModifier, ...(p?.viewModifier || {}) },
    viewIngredients: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewIngredients, ...(p?.viewIngredients || {}) },
    viewMenu: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewMenu, ...(p?.viewMenu || {}) },
    viewRecap: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewRecap, ...(p?.viewRecap || {}) },
    viewEmployees: { ...DEFAULT_BACKOFFICE_PERMISSIONS.viewEmployees, ...(p?.viewEmployees || {}) },
  };
}

function getDefaultPermissions() {
  return {
    app: getMergedAppPermissions(),
    backoffice: getMergedBackofficePermissions(),
  };
}


export default function EmployeeAccess() {
  const [roles, setRoles] = useState<RoleEmployee[]>([]);

  // Kontrol side panel form (Create/Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // false = create, true = edit
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  // Role Name
  const [roleName, setRoleName] = useState("");

  // App & Back permissions
  const { app: initialApp, backoffice: initialBack } = getDefaultPermissions();
  const [appPermissions, setAppPermissions] = useState<AppPermissions>(initialApp);
  const [backofficePermissions, setBackofficePermissions] = useState<BackofficePermissions>(initialBack);

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
    setRoleName("");

    const { app, backoffice } = getDefaultPermissions();
    setAppPermissions(app);
    setBackofficePermissions(backoffice);
  };


  // ===================== EDIT =====================
  const openEditForm = (role: RoleEmployee) => {
    setShowForm(true);
    setIsEditMode(true);
    setEditingRoleId(role.id);
    setRoleName(role.name);

    setAppPermissions(getMergedAppPermissions(role.appPermissions));
    setBackofficePermissions(getMergedBackofficePermissions(role.backofficePermissions));
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
  const renderPermissions: any = (obj: Record<string, any>, labelPrefix = "") => {
    return Object.entries(obj).flatMap(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        return renderPermissions(value, `${labelPrefix}${key}.`);
      }
      if (value) {
        return <li key={labelPrefix + key}>{labelPrefix + key}</li>;
      }
      return [];
    });
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
  const toggleParentPermission = (
    parentKey: keyof BackofficePermissions,
    childrenKey: keyof Omit<BackofficePermissions, "viewDashboard">,
    checked: boolean
  ) => {
    const treeItem = backofficePermissionTree.find(
      (item) => item.parentKey === parentKey && item.type === "group" && item.childrenKey === childrenKey
    );

    if (!treeItem || !("children" in treeItem)) return;

    const newChildrenState = Object.fromEntries(
      treeItem.children.map((child) => [child.key, checked])
    );

    setBackofficePermissions((prev) => ({
      ...prev,
      [parentKey]: checked,
      [childrenKey]: newChildrenState,
    }));
  };


  return (
    <div className="flex min-h-screen bg-white text-black">
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
                          <li key={emp.id}> {emp.name}
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
                {appPermissionTree.map((item) => (
                  <label key={item.key}>
                    <input
                      type="checkbox"
                      checked={appPermissions[item.key]}
                      onChange={(e) =>
                        setAppPermissions((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                    />{" "}
                    {item.label}
                  </label>
                ))}
              </div>

            </fieldset>

            {/* Backoffice Permissions */}
            <fieldset className="border rounded p-3">
              <legend className="font-semibold">Backoffice Permissions</legend>

              {backofficePermissionTree.map((section) => {
                if (section.type === "group") {
                  return (
                    <div key={section.parentKey} className="mt-2">
                      <label>
                        <input
                          type="checkbox"
                          checked={backofficePermissions[section.parentKey]}
                          onChange={(e) =>
                            toggleParentPermission(
                              section.parentKey,
                              section.childrenKey!,
                              e.target.checked
                            )
                          }
                        />
                        {" "}<span className="font-medium">{section.label}</span>
                      </label>

                      <ul className="ml-6 list-disc space-y-1 mt-1">
                        {section.children.map((child) => (
                          <li key={child.key}>
                            <label>
                              <input
                                type="checkbox"
                                checked={(backofficePermissions[section.childrenKey!] as any)[child.key]}
                                onChange={(e) =>
                                  setBackofficePermissions((prev) => ({
                                    ...prev,
                                    [section.childrenKey!]: {
                                      ...prev[section.childrenKey!],
                                      [child.key]: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              {" "}{child.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                // Untuk single checkbox seperti viewDashboard
                return (
                  <div key={section.parentKey} className="mt-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={backofficePermissions[section.parentKey]}
                        onChange={(e) =>
                          setBackofficePermissions((prev) => ({
                            ...prev,
                            [section.parentKey]: e.target.checked,
                          }))
                        }
                      />
                      {" "}{section.label}
                    </label>
                  </div>
                );
              })}
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
            {privilegesRole.appPermissions &&
              appPermissionTree.some((item) => privilegesRole.appPermissions?.[item.key]) ? (
              <ul className="list-disc list-inside ml-4">
                {appPermissionTree.map((item) =>
                  privilegesRole.appPermissions?.[item.key] ? <li key={item.key}>{item.label}</li> : null
                )}
              </ul>
            ) : (
              <p className="text-gray-500">No App Permissions</p>
            )}

          </div>

          {/* Backoffice Permissions */}
          <div>
            <h3 className="font-semibold mb-2">Backoffice Permissions</h3>

            {(() => {
              const perms = privilegesRole.backofficePermissions;

              // Cek apakah ada permission yang aktif
              const hasAnyPermission = backofficePermissionTree.some((section) => {
                if (section.type === "single") {
                  return (perms as any)[section.parentKey];
                }

                return section.children.some(
                  (child) => ((perms?.[section.childrenKey!] as any) ?? {})[child.key]
                );
              });

              if (!hasAnyPermission) {
                return <p className="text-gray-500">No Backoffice Permissions</p>;
              }

              return backofficePermissionTree.map((section) => {
                if (section.type === "single") {
                  return (perms as any)[section.parentKey] ? (
                    <div key={section.parentKey}>- {section.label}</div>
                  ) : null;
                }

                const activeChildren = section.children.filter(
                  (child) => ((perms?.[section.childrenKey!] as any) ?? {})[child.key]
                );

                return activeChildren.length > 0 ? (
                  <div key={section.parentKey}>
                    - {section.label}
                    <ul className="list-disc list-inside ml-4">
                      {activeChildren.map((child) => (
                        <li key={child.key}>{child.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              });
            })()}
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
