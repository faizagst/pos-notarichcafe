import { useState } from "react";

export default function TransactionTabs() {
  const [activeTab, setActiveTab] = useState("success");

  return (
    <div className="flex border-b mb-4">
      {["Success Orders", "Cancelled Orders", "Void Items"].map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 ${activeTab === tab ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
