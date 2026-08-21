import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PAGE_ORDER } from "../../constants/categories";
import useI18n from "../../hooks/useI18n";

/**
 * Top nav map: Back (history) + breadcrumb
 * No Back on Dashboard (landing after login)
 */
export default function PageNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const current = PAGE_ORDER.find((p) => p.path === location.pathname);
  if (!current) return null;

  const isDashboard = location.pathname === "/";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {!isDashboard && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
            bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          title="Go back"
        >
          <ChevronLeft size={16} />
          <span>{t("back")}</span>
        </button>
      )}

      <nav className="flex items-center flex-wrap gap-1 text-sm text-slate-500 dark:text-slate-400">
        <Link
          to="/"
          className="inline-flex items-center gap-1 hover:text-teal-700 dark:hover:text-teal-400 transition"
        >
          <Home size={14} />
          <span>{t("dashboard")}</span>
        </Link>
        {!isDashboard && (
          <>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {t(current.key)}
            </span>
          </>
        )}
      </nav>
    </div>
  );
}
