'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Diff Viewer" (boardui.com/).
 * No BoardUI source was used.
 */
import { CodeDiffViewer } from '@/registry/ui/code-diff-viewer';

const BEFORE = `import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kinetic-theme";

/**
 * Reads the saved theme from storage.
 * Storage can throw in private windows, so it is wrapped.
 */
function readTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Saves the choice. Failing to save is not an error:
 * the theme still applies for this visit.
 */
function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private window or full storage
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Keeps the theme in React state and on the document.
 * The first render is always light to match the server.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = readTheme();
    if (saved) {
      applyTheme(saved);
      setThemeState(saved);
    }
  }, []);

  const setTheme = (next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  };

  return { theme, setTheme };
}

/** The theme a toggle button switches to. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** Accessible name for the toggle button. */
export function themeLabel(theme: Theme): string {
  return "Switch to " + nextTheme(theme) + " mode";
}
`;

const AFTER = `import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kinetic-theme";

/**
 * Reads the saved theme from storage.
 * Storage can throw in private windows, so it is wrapped.
 */
function readTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Saves the choice. Failing to save is not an error:
 * the theme still applies for this visit.
 */
function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private window or full storage
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Keeps the theme in React state and on the document.
 * The first render is always light to match the server.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = readTheme();
    if (saved) {
      applyTheme(saved);
      setThemeState(saved);
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    saveTheme(next);
    applyTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}

/** The theme a toggle button switches to. */
export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** Accessible name for the toggle button. */
export function themeLabel(theme: Theme): string {
  return "Switch to " + nextTheme(theme) + " mode";
}
`;

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-4 sm:p-6">
      <CodeDiffViewer
        fileName="app/lib/theme.ts"
        oldCode={BEFORE}
        newCode={AFTER}
        className="h-[528px] w-full max-w-[1040px]"
      />
    </div>
  );
}
