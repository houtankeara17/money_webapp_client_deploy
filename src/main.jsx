import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./store/AuthContext";
import { ThemeProvider } from "./store/ThemeContext";
import "./styles/index.css";

// Apply saved theme before first paint to avoid flash
(function initTheme() {
  const theme = localStorage.getItem("theme") || "system";
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  document.documentElement.classList.toggle("dark", !!isDark);
  document.documentElement.classList.toggle("light", !isDark);
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              className: "dark:bg-slate-800 dark:text-slate-100",
              style: {
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
