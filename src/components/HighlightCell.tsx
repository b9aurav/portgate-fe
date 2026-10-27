"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import { useHighlight } from "@/context/HighlightContext";

interface HlProps {
  id: string;
  className?: string;
  children: ReactNode;
}

/**
 * <Hl> — Highlight wrapper component for interactive cell highlighting.
 * 
 * Checks if `id` is in `activeCells` and applies appropriate highlight styling.
 * When highlighted, sets `data-hl="1"` for auto-scroll targeting.
 */
export function Hl({ id, className = "", children }: HlProps) {
  const { activeCells, activeSev, activeId, activeTab } = useHighlight();
  const ref = useRef<HTMLSpanElement>(null);

  const isHighlighted = activeCells.includes(id);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      // Smooth scroll into view when this cell becomes highlighted
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, activeId, activeTab]);

  if (!isHighlighted) {
    return <span className={className}>{children}</span>;
  }

  const highlightClass =
    activeSev === "crit"
      ? "bg-red-100 text-red-900 ring-2 ring-red-600 font-bold rounded px-1.5 py-0.5 transition-all"
      : activeSev === "warn"
      ? "bg-amber-100 text-amber-900 ring-2 ring-amber-500 font-bold rounded px-1.5 py-0.5 transition-all"
      : "";

  return (
    <span ref={ref} className={`${className} ${highlightClass}`} data-hl="1">
      {children}
    </span>
  );
}
