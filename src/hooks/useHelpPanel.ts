"use client";

import { useState, useEffect } from "react";

const HELP_PANEL_KEY = "mejai_help_panel_enabled_v1";
const HELP_PANEL_COLLAPSED_KEY = "mejai_help_panel_collapsed_v1";

export function useHelpPanelEnabled() {
  const [enabled, setEnabled] = useState(() => {
    try {
      if (typeof window === "undefined") return true;
      const raw = localStorage.getItem(HELP_PANEL_KEY);
      if (raw === null) return true; // default ON
      return raw === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HELP_PANEL_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [enabled]);

  return { enabled, setEnabled };
}

export function useHelpPanelCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const raw = localStorage.getItem(HELP_PANEL_COLLAPSED_KEY);
      if (raw === null) return false;
      return raw === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HELP_PANEL_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  return { collapsed, setCollapsed };
}
