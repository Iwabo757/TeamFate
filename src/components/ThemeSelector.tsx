import { useState } from "react";
import { useTheme, type Theme } from "../contexts/ThemeContext";

type ThemeOption = {
  id: Theme;
  label: string;
  icon: string;
};

const visualThemes: ThemeOption[] = [
  {
    id: "default",
    label: "Fate Default",
    icon: "🔵",
  },
  {
    id: "purple",
    label: "Purple",
    icon: "🟣",
  },
  {
    id: "crimson",
    label: "Crimson",
    icon: "🔴",
  },
  {
    id: "forest",
    label: "Forest",
    icon: "🟢",
  },
  {
    id: "ember",
    label: "Ember",
    icon: "🟠",
  },
  {
    id: "midnight",
    label: "Midnight",
    icon: "🌙",
  },
  {
    id: "gold",
    label: "Gold",
    icon: "🟡",
  },
];

const accessibilityThemes: ThemeOption[] = [
  {
    id: "protanopia",
    label: "Protanopia",
    icon: "👁",
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    icon: "👁",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    icon: "👁",
  },
];

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);

  const { theme, setTheme } = useTheme();

  const allThemes = [
    ...visualThemes,
    ...accessibilityThemes,
  ];

  const currentTheme =
    allThemes.find(
      (item) => item.id === theme
    ) ?? visualThemes[0];

  function handleThemeChange(
    selectedTheme: Theme
  ) {
    setTheme(selectedTheme);
    setIsOpen(false);
  }

  return (
    <div className="theme-selector">
      <button
        type="button"
        className="theme-selector-button"
        onClick={() =>
          setIsOpen((previous) => !previous)
        }
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="theme-selector-icon">
          {currentTheme.icon}
        </span>

        <span className="theme-selector-label">
          {currentTheme.label}
        </span>

        <span
          className={`theme-selector-arrow ${
            isOpen ? "is-open" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="theme-selector-menu"
          role="menu"
        >
          <div className="theme-selector-section">
            <div className="theme-selector-heading">
              Themes
            </div>

            {visualThemes.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`theme-selector-option ${
                  theme === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleThemeChange(item.id)
                }
              >
                <span className="theme-option-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

                {theme === item.id && (
                  <span className="theme-check">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="theme-selector-divider" />

          <div className="theme-selector-section">
            <div className="theme-selector-heading">
              Accessibility
            </div>

            {accessibilityThemes.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`theme-selector-option ${
                    theme === item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleThemeChange(item.id)
                  }
                >
                  <span className="theme-option-icon">
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>

                  {theme === item.id && (
                    <span className="theme-check">
                      ✓
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}