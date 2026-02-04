"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PERFORMANCE_CONFIG,
  PERFORMANCE_CONFIG_STORAGE_KEY,
  PERFORMANCE_CONFIG_UPDATED_EVENT,
  type PerformanceConfig,
  readPerformanceConfigFromStorage,
  sanitizePerformanceConfig,
  writePerformanceConfigToStorage,
} from "@/lib/performanceConfig";

export function usePerformanceConfig() {
  const [config, setConfig] = useState<PerformanceConfig>(() => readPerformanceConfigFromStorage());

  useEffect(() => {
    function syncFromStorage() {
      setConfig(readPerformanceConfigFromStorage());
    }

    function onStorage(event: StorageEvent) {
      if (event.key && event.key !== PERFORMANCE_CONFIG_STORAGE_KEY) return;
      syncFromStorage();
    }

    function onConfigUpdate() {
      syncFromStorage();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(PERFORMANCE_CONFIG_UPDATED_EVENT, onConfigUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PERFORMANCE_CONFIG_UPDATED_EVENT, onConfigUpdate);
    };
  }, []);

  const setAndPersist = useCallback((next: PerformanceConfig) => {
    const sanitized = sanitizePerformanceConfig(next);
    setConfig(sanitized);
    writePerformanceConfigToStorage(sanitized);
  }, []);

  const resetToDefault = useCallback(() => {
    setAndPersist(DEFAULT_PERFORMANCE_CONFIG);
  }, [setAndPersist]);

  return { config, setAndPersist, resetToDefault };
}
