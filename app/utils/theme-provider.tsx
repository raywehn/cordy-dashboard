import { createContext, useContext, useEffect, useState } from "react";

enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT); // Default to light mode

  useEffect(() => {
    // On mount, restore theme from localStorage if available
    const savedTheme = window.localStorage.getItem("color-theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === Theme.DARK) {
        document.documentElement.classList.add(Theme.DARK);
      } else {
        document.documentElement.classList.remove(Theme.DARK);
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK;
      
      // Save to localStorage
      window.localStorage.setItem("color-theme", newTheme);
      
      // Apply to document
      if (newTheme === Theme.DARK) {
        document.documentElement.classList.add(Theme.DARK);
      } else {
        document.documentElement.classList.remove(Theme.DARK);
      }
      
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}