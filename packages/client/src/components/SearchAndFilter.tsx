import { useState, useEffect, useRef, useMemo } from "react";
import { SearchIcon, CalendarIcon, CloseIcon } from "./icons";

export type DateFilter =
  | { mode: "single"; date: string }
  | { mode: "range"; dateFrom: string; dateTo: string };

export type SearchFilterState = {
  query: string;
  activeFilter: string;
  activeMore: string[];
  dateFilter: DateFilter;
};

interface Props {
  filters: string[];
  value: SearchFilterState;
  onChange: (state: SearchFilterState) => void;
}

// local time
const fmtDate = (v: string) =>
  new Date(`${v}T00:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });

const dateInputClass =
  "flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400";

export default function SearchAndFilter({ filters, value, onChange }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateMode, setDateMode] = useState<"single" | "range">(
    value.dateFilter.mode
  );
  const [dateFrom, setDateFrom] = useState(
    value.dateFilter.mode === "single"
      ? value.dateFilter.date
      : value.dateFilter.dateFrom
  );
  const [dateTo, setDateTo] = useState(
    value.dateFilter.mode === "range" ? value.dateFilter.dateTo : ""
  );
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      if (current > lastScrollY && current > 60) setExpanded(false);
      else setExpanded(true);
      setLastScrollY(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const update = (partial: Partial<SearchFilterState>) =>
    onChange({ ...value, ...partial });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") update({ query: value.query });
  };

  const applyDate = () => {
    update({
      dateFilter:
        dateMode === "single"
          ? { mode: "single", date: dateFrom }
          : { mode: "range", dateFrom, dateTo },
    });
    setShowDatePicker(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateFrom("");
    setDateTo("");
    update({
      dateFilter:
        dateMode === "range"
          ? { mode: "range", dateFrom: "", dateTo: "" }
          : { mode: "single", date: "" },
    });
  };

  const dateLabel = useMemo(() => {
    if (value.dateFilter.mode === "single" && value.dateFilter.date)
      return fmtDate(value.dateFilter.date);
    if (value.dateFilter.mode === "range") {
      const { dateFrom, dateTo } = value.dateFilter;
      if (dateFrom && dateTo)
        return `${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;
      if (dateFrom) return `From ${fmtDate(dateFrom)}`;
      if (dateTo) return `Until ${fmtDate(dateTo)}`;
    }
    return "";
  }, [value.dateFilter]);

  return (
    <div className="sticky top-header z-40 bg-white">
      <div className="px-7 pt-3 pb-3" onClick={() => setExpanded(true)}>
        <div className="flex items-center border border-gray-200 rounded-full px-4 gap-2 focus-within:border-orange-400 transition-colors bg-gray-50 focus-within:bg-white">
          <SearchIcon className="w-4 h-4 text-gray-300 shrink-0" />
          <input
            value={value.query}
            onChange={(e) => update({ query: e.target.value })}
            onKeyDown={handleKeyDown}
            onFocus={() => setExpanded(true)}
            placeholder="Search events, venues, series..."
            className="flex-1 py-2.5 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
          />
        </div>
      </div>

      <div
        className={`flex items-center transition-all duration-200 ${
          expanded ? "max-h-14 opacity-100 pb-3" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide px-7 min-w-0">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => update({ activeFilter: filter })}
              className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full border transition-all ${
                value.activeFilter === filter
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div
          className="relative shrink-0 pr-7 pl-3 border-l border-gray-100 ml-2"
          ref={dateRef}
        >
          <button
            onClick={() => setShowDatePicker((currentState) => !currentState)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              dateLabel
                ? "border-orange-400 text-orange-500 bg-orange-50"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <CalendarIcon />
            {dateLabel || "Date"}
            {dateLabel && (
              <span
                onClick={clearDate}
                className="ml-0.5 flex items-center text-gray-400 hover:text-orange-500"
              >
                <CloseIcon className="w-3 h-3" />
              </span>
            )}
          </button>

          {showDatePicker && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-lg z-50 w-72">
              <div className="flex gap-2 mb-4">
                {(["single", "range"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDateMode(m)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all ${
                      dateMode === m
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {m === "single" ? "Single date" : "Date range"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {dateMode === "single" ? (
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={dateInputClass}
                  />
                ) : (
                  <>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={dateInputClass}
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={dateInputClass}
                      placeholder="To"
                    />
                  </>
                )}
              </div>

              <button
                onClick={applyDate}
                className="w-full mt-3 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
