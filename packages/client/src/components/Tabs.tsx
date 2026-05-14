interface Tab<T extends string> {
  value: T;
  label: string;
  content: React.ReactNode;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onTabChange: (tab: T) => void;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onTabChange,
}: TabsProps<T>) {
  const activeTab = tabs.find((t) => t.value === active);

  return (
    <div>
      {/* tab buttons */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={` cursor-pointer flex-1 py-3 text-sm font-semibold transition-colors ${
              active === tab.value
                ? "text-orange-500 border-b-2 border-orange-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* active tab content */}
      <div className="p-4">{activeTab?.content}</div>
    </div>
  );
}
