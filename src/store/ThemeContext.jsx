import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const ThemeContext = createContext(null);

function getSystemDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
}

function applyDomTheme(theme) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" || (theme === "system" && getSystemDark());

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export const ThemeProvider = ({ children }) => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );
  const [resolvedDark, setResolvedDark] = useState(() => {
    const t = localStorage.getItem("theme") || "system";
    return t === "dark" || (t === "system" && getSystemDark());
  });

  // Sync from user profile
  useEffect(() => {
    if (user) {
      const t = user.theme;
      // Migrate legacy theme names → dark/light/system
      if (t === "dark" || t === "light" || t === "system") {
        setTheme(t);
      } else if (t && String(t).startsWith("theme-")) {
        setTheme("dark"); // old color themes were dark-based
      }
      if (user.language) setLanguage(user.language);
    }
  }, [user]);

  // Apply theme to DOM
  useEffect(() => {
    applyDomTheme(theme);
    setResolvedDark(
      theme === "dark" || (theme === "system" && getSystemDark())
    );
  }, [theme]);

  // Listen for system preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyDomTheme("system");
      setResolvedDark(mq.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [theme]);

  const changeTheme = useCallback(
    async (newTheme) => {
      if (!["dark", "light", "system"].includes(newTheme)) return;
      setTheme(newTheme);
      applyDomTheme(newTheme);
      if (isAuthenticated) {
        try {
          const { data } = await api.put("/auth/profile", { theme: newTheme });
          if (data?.data) updateUser(data.data);
        } catch (e) {
          console.error("Failed to save theme", e);
        }
      }
    },
    [isAuthenticated, updateUser]
  );

  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      localStorage.setItem("language", lang);
      document.documentElement.lang = lang === "km" ? "km" : "en";
      if (isAuthenticated) {
        try {
          const { data } = await api.put("/auth/profile", { language: lang });
          if (data?.data) updateUser(data.data);
        } catch (e) {
          console.error("Failed to save language", e);
        }
      }
    },
    [isAuthenticated, updateUser]
  );

  const changeCurrency = useCallback(
    async (currency) => {
      if (!isAuthenticated) return null;
      try {
        const { data } = await api.put("/auth/profile", { currency });
        if (data?.data) updateUser(data.data);
        return data;
      } catch (e) {
        console.error("Failed to save currency", e);
        throw e;
      }
    },
    [isAuthenticated, updateUser]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        language,
        resolvedDark,
        changeTheme,
        changeLanguage,
        changeCurrency,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
