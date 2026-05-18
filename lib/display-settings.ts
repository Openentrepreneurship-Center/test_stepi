"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "stepi-display-settings";

export type DisplaySettings = {
  showInterviewQuestions: boolean;
};

const DEFAULTS: DisplaySettings = {
  showInterviewQuestions: true,
};

function read(): DisplaySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function write(s: DisplaySettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("stepi-display-settings-changed"));
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(read());
    setHydrated(true);
    const onChange = () => setSettings(read());
    window.addEventListener("stepi-display-settings-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("stepi-display-settings-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = (patch: Partial<DisplaySettings>) => {
    const next = { ...read(), ...patch };
    setSettings(next);
    write(next);
  };

  return { settings, update, hydrated };
}
