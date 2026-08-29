import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* =========================================
   THEME TYPES
========================================= */

export type Theme =
  | "default"
  | "purple"
  | "crimson"
  | "forest"
  | "ember"
  | "midnight"
  | "gold"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

/* =========================================
   CONTEXT
========================================= */

const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

/* =========================================
   STORAGE KEY
========================================= */

const THEME_STORAGE_KEY = "team-fate-theme";

/* =========================================
   PROVIDER
========================================= */

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] =
    useState<Theme>(() => {
      const savedTheme =
        localStorage.getItem(
          THEME_STORAGE_KEY
        );

      if (savedTheme) {
        return savedTheme as Theme;
      }

      return "default";
    });

  /* =====================================
     APPLY THEME TO DOCUMENT
  ====================================== */

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      THEME_STORAGE_KEY,
      theme
    );
  }, [theme]);

  /* =====================================
     SET THEME
  ====================================== */

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* =========================================
   HOOK
========================================= */

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}