import { useEffect, useRef, useState } from "react";
import { type Theme, useTheme } from "../contexts/ThemeContext";

type ThemeOption = {
  value: Theme;
  label: string;
  icon: string;
};

const visualThemes: ThemeOption[] = [
  {
    value: "default",
    label: "Fate Default",
    icon: "🔵",
  },
  {
    value: "purple",
    label: "Purple",
    icon: "🟣",
  },
  {
    value: "crimson",
    label: "Crimson",
    icon: "🔴",
  },
  {
    value: "forest",
    label: "Forest",
    icon: "🟢",
  },
  {
    value: "ember",
    label: "Ember",
    icon: "🟠",
  },
  {
    value: "midnight",
    label: "Midnight",
    icon: "⚫",
  },
  {
    value: "gold",
    label: "Gold",
    icon: "🟡",
  },
];

const accessibilityThemes: ThemeOption[] = [
  {
    value: "protanopia",
    label: "Protanopia",
    icon: "👁",
  },
  {
    value: "deuteranopia",
    label: "Deuteranopia",
    icon: "👁",
  },
  {
    value: "tritanopia",
    label: "Tritanopia",
    icon: "👁",
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);

  const selectorRef = useRef<HTMLDivElement>(null);

  const selectedTheme =
    [...visualThemes, ...accessibilityThemes].find(
      (option) => option.value === theme
    ) ?? visualThemes[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function handleThemeChange(
    selectedTheme: Theme
  ) {
    setTheme(selectedTheme);
    setOpen(false);
  }

  return (
    <div
      className="theme-selector"
      ref={selectorRef}
    >
      <button
        type="button"
        className="theme-selector-button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="theme-selector-icon">
          {selectedTheme.icon}
        </span>

        <span className="theme-selector-label">
          {selectedTheme.label}
        </span>

        <span
          className={`theme-selector-arrow ${
            open ? "is-open" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="theme-selector-menu"
          role="menu"
        >
          <div className="theme-selector-section">
            <span className="theme-selector-heading">
              Themes
            </span>

            {visualThemes.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                className={`theme-selector-option ${
                  theme === option.value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleThemeChange(option.value)
                }
              >
                <span className="theme-option-icon">
                  {option.icon}
                </span>

                <span>{option.label}</span>

                {theme === option.value && (
                  <span className="theme-check">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="theme-selector-divider" />

          <div className="theme-selector-section">
            <span className="theme-selector-heading">
              Accessibility
            </span>

            {accessibilityThemes.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                className={`theme-selector-option ${
                  theme === option.value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleThemeChange(option.value)
                }
              >
                <span className="theme-option-icon">
                  {option.icon}
                </span>

                <span>{option.label}</span>

                {theme === option.value && (
                  <span className="theme-check">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}