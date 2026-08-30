import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme =
  | "default"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

const THEME_STORAGE_KEY = "team-fate-theme";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY
    );

    if (
      savedTheme === "default" ||
      savedTheme === "protanopia" ||
      savedTheme === "deuteranopia" ||
      savedTheme === "tritanopia"
    ) {
      return savedTheme;
    }

    return "default";
  });

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

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}