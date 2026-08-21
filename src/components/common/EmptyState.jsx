import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 animate-bounce"
        style={{ animationDuration: "2s" }}
      >
        <Icon size={28} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {title || "No data yet"}
      </h3>
      {hint && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">{hint}</p>
      )}
      {action}
    </div>
  );
}
