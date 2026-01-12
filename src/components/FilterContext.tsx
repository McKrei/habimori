"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type FilterContextValue = {
  isFilterOpen: boolean;
  openFilter: () => void;
  closeFilter: () => void;
  activeFilterCount: number;
  setActiveFilterCount: (count: number) => void;
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const openFilter = useCallback(() => setIsFilterOpen(true), []);
  const closeFilter = useCallback(() => setIsFilterOpen(false), []);

  return (
    <FilterContext.Provider
      value={{
        isFilterOpen,
        openFilter,
        closeFilter,
        activeFilterCount,
        setActiveFilterCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within FilterProvider");
  }
  return context;
}
