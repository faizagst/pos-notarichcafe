export const backofficePermissionTree = [
    {
      parentKey: "viewDashboard",
      label: "Dashboard",
      type: "single",
    },
    {
      parentKey: "viewReportsParent",
      label: "Reports",
      type: "group",
      childrenKey: "viewReports",
      children: [
        { key: "sales", label: "Sales" },
        { key: "transactions", label: "Transactions" },
      ],
    },
    {
      parentKey: "viewInventoryParent",
      label: "Inventory",
      type: "group",
      childrenKey: "viewInventory",
      children: [
        { key: "summary", label: "Summary" },
        { key: "supplier", label: "Supplier" },
        { key: "purchaseOrder", label: "Purchase Order" },
      ],
    },
    {
      parentKey: "viewLibraryParent",
      label: "Library",
      type: "group",
      childrenKey: "viewLibrary",
      children: [
        { key: "bundlePackage", label: "Bundle Package" },
        { key: "discounts", label: "Discounts" },
        { key: "taxes", label: "Taxes" },
        { key: "gratuity", label: "Gratuity" },
      ],
    },
    {
      parentKey: "viewModifierParent",
      label: "Modifier",
      type: "group",
      childrenKey: "viewModifier",
      children: [
        { key: "modifiersLibrary", label: "Modifiers Library" },
        { key: "modifierCategory", label: "Modifier Category" },
      ],
    },
    {
      parentKey: "viewIngredientsParent",
      label: "Ingredients",
      type: "group",
      childrenKey: "viewIngredients",
      children: [
        { key: "ingredientsLibrary", label: "Ingredients Library" },
        { key: "ingredientsCategory", label: "Ingredients Category" },
        { key: "recipes", label: "Recipes" },
      ],
    },
    {
      parentKey: "viewMenuParent",
      label: "Menu",
      type: "group",
      childrenKey: "viewMenu",
      children: [
        { key: "menuList", label: "Menu List" },
        { key: "menuCategory", label: "Menu Category" },
      ],
    },
    {
      parentKey: "viewRecapParent",
      label: "Recap",
      type: "group",
      childrenKey: "viewRecap",
      children: [
        { key: "stockCafe", label: "Stock Cafe" },
        { key: "stockInventory", label: "Stock Inventory" },
        { key: "prediction", label: "Stock Prediction" },
      ],
    },
    {
      parentKey: "viewEmployeesParent",
      label: "Employees",
      type: "group",
      childrenKey: "viewEmployees",
      children: [
        { key: "employeeSlots", label: "Employee Slots" },
        { key: "employeeAccess", label: "Employee Access" },
      ],
    },
  ] as const;
  