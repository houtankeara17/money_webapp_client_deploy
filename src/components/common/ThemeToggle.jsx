import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../store/ThemeContext";

/** Navbar icon that cycles dark → light → system */
export function ThemeToggle({ size = "md" }) {
  const { theme, changeTheme, resolvedDark } = useTheme();

  const cycle = () => {
    if (theme === "dark") changeTheme("light");
    else if (theme === "light") changeTheme("system");
    else changeTheme("dark");
  };

  const icon = size === "sm" ? 13 : 15;
  const pad = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme}`}
      className={`${pad} rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-700/70 backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-600 transition text-slate-700 dark:text-slate-200`}
    >
      {theme === "system" ? (
        <Monitor size={icon} />
      ) : resolvedDark ? (
        <Moon size={icon} />
      ) : (
        <Sun size={icon} className="text-amber-500" />
      )}
    </button>
  );
}

/** iOS switch light ↔ dark */
export function ThemeSwitch() {
  const { resolvedDark, changeTheme, theme } = useTheme();
  const on = resolvedDark;

  return (
    <div className="flex items-center gap-3">
      <Sun size={16} className={!on ? "text-amber-500" : "text-slate-400"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => changeTheme(on ? "light" : "dark")}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
          on ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <Moon size={16} className={on ? "text-teal-400" : "text-slate-400"} />
      <span className="text-xs text-slate-500 capitalize">{theme}</span>
    </div>
  );
}

/**
 * Grok-style theme preview cards: Light / Dark / System
 */
export function ThemeCards() {
  const { theme, changeTheme } = useTheme();

  const cards = [
    {
      id: "light",
      label: "Light",
      preview: (
        <div className="w-full h-14 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 p-1.5 flex flex-col gap-1">
          <div className="h-1.5 w-8 rounded bg-slate-300" />
          <div className="h-1.5 w-12 rounded bg-slate-200" />
          <div className="h-1.5 w-6 rounded bg-slate-200" />
        </div>
      ),
    },
    {
      id: "dark",
      label: "Dark",
      preview: (
        <div className="w-full h-14 rounded-lg bg-gradient-to-b from-slate-900 to-black border border-slate-700 p-1.5 flex flex-col gap-1">
          <div className="h-1.5 w-8 rounded bg-slate-600" />
          <div className="h-1.5 w-12 rounded bg-slate-700" />
          <div className="h-1.5 w-6 rounded bg-slate-700" />
        </div>
      ),
    },
    {
      id: "system",
      label: "System",
      preview: (
        <div className="w-full h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 flex">
          <div className="w-1/2 bg-slate-100 p-1.5 flex flex-col gap-1">
            <div className="h-1 w-6 rounded bg-slate-300" />
            <div className="h-1 w-8 rounded bg-slate-200" />
          </div>
          <div className="w-1/2 bg-slate-900 p-1.5 flex flex-col gap-1">
            <div className="h-1 w-6 rounded bg-slate-600" />
            <div className="h-1 w-8 rounded bg-slate-700" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex gap-3">
      {cards.map((c) => {
        const active = theme === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => changeTheme(c.id)}
            className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition ${
              active
                ? "border-teal-500 bg-teal-50/80 dark:bg-teal-950/40"
                : "border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            }`}
          >
            {c.preview}
            <span
              className={`text-xs font-medium ${
                active
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
