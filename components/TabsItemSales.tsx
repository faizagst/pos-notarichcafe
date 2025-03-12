import React from "react";

type TabProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const Tabs: React.FC<TabProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b">
      <button
        onClick={() => setActiveTab("income")}
        className={`px-4 py-2 ${
          activeTab === "income" ? "border-b-2 border-blue-500 font-bold" : ""
        }`}
      >
        Income
      </button>
      <button
        onClick={() => setActiveTab("quantity")}
        className={`px-4 py-2 ${
          activeTab === "quantity" ? "border-b-2 border-blue-500 font-bold" : ""
        }`}
      >
        Quantity
      </button>
    </div>
  );
};

export default Tabs;
