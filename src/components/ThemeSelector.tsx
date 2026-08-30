import { useTheme, type Theme } from "../contexts/ThemeContext";

type ThemeOption = {
  value: Theme;
  label: string;
};

const themes: ThemeOption[] = [
  {
    value: "default",
    label: "Fate Default",
  },
  {
    value: "protanopia",
    label: "Protanopia",
  },
  {
    value: "deuteranopia",
    label: "Deuteranopia",
  },
  {
    value: "tritanopia",
    label: "Tritanopia",
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector">
      <select
        className="theme-selector-select"
        value={theme}
        onChange={(event) =>
          setTheme(event.target.value as Theme)
        }
        aria-label="Select accessibility theme"
      >
        {themes.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}