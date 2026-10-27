"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { Severity } from "@/types/audit";

interface HighlightState {
  activeId: string | null;
  activeCells: string[];
  activeSev: Severity | null;
  activeTab: string;
}

interface HighlightContextValue extends HighlightState {
  setHighlight: (id: string | null, cells: string[], sev: Severity | null, tab?: string) => void;
  setActiveTab: (tab: string) => void;
}

const HighlightContext = createContext<HighlightContextValue | null>(null);

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HighlightState>({
    activeId: null,
    activeCells: [],
    activeSev: null,
    activeTab: "po",
  });

  const setHighlight = (id: string | null, cells: string[], sev: Severity | null, tab?: string) => {
    setState((prev) => ({
      ...prev,
      activeId: id,
      activeCells: cells,
      activeSev: sev,
      ...(tab ? { activeTab: tab } : {}),
    }));
  };

  const setActiveTab = (tab: string) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  };

  return (
    <HighlightContext.Provider value={{ ...state, setHighlight, setActiveTab }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight() {
  const context = useContext(HighlightContext);
  if (!context) {
    throw new Error("useHighlight must be used within HighlightProvider");
  }
  return context;
}
