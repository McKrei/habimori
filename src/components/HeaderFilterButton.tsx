"use client";

import { usePathname } from "next/navigation";
import FilterIcon from "@/src/components/icons/FilterIcon";
import { useFilter } from "@/src/components/FilterContext";

const PAGES_WITH_FILTER = ["/", "/stats", "/time-logs"];

export default function HeaderFilterButton() {
  const pathname = usePathname();
  const { openFilter, activeFilterCount } = useFilter();

  // Only show on specific pages
  if (!PAGES_WITH_FILTER.includes(pathname)) {
    return null;
  }

  return (
    <button
      onClick={openFilter}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-9 sm:w-9"
      aria-label="Фильтры"
      title="Фильтры"
    >
      <FilterIcon size={16} />
      {activeFilterCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-medium text-white">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}
