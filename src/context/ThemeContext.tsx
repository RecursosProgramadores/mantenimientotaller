import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "mantepro-theme";

function getInitialTheme(): Theme {
  // The inline script in index.html already applies the class before hydration;
  // reading it back keeps React state in sync with what's actually painted.
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // localStorage unavailable (private mode, blocked, etc.) — fall through.
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  }
  return "light";
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  // Tracks whether the user made an explicit choice (vs. following the OS setting).
  const userChoseRef = useRef(false);

  useEffect(() => {
    try {
      userChoseRef.current = window.localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      userChoseRef.current = false;
    }
  }, []);

  // Apply + persist whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore — theme still applies for this session even if it can't persist.
    }
  }, [theme]);

  // Live-follow the OS preference until the user picks a theme explicitly.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!userChoseRef.current) setThemeState(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = (t: Theme) => {
    userChoseRef.current = true;
    setThemeState(t);
  };

  const toggleTheme = () => {
    userChoseRef.current = true;
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  return ctx;
}
