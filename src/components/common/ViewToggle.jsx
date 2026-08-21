import { LayoutGrid, List, Table2 } from "lucide-react";

const TRANSLATIONS = {
  en: {
    grid: "Grid",
    table: "Table",
    list: "List",
  },
  km: {
    grid: "ប្រអប់",
    table: "តារាង",
    list: "បញ្ជី", // Corrected spelling of list in Khmer
  },
};

const MODES = [
  { id: "grid", icon: LayoutGrid },
  { id: "list", icon: List },
  { id: "table", icon: Table2 },
];

export default function ViewToggle({ view, onChange, lang = "km" }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = view === m.id;
        const label = t[m.id];

        return (
          <button
            key={m.id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onChange(m.id)}
            className={`p-2 rounded-lg transition ${
              active
                ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
