import { useRef, useEffect, useState, useMemo } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
  TrendingUp,
  Upload,
  Download,
  Building2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../store/AuthContext";
import useI18n from "../hooks/useI18n";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ConfirmModal from "../components/common/ConfirmModal";
import ViewToggle from "../components/common/ViewToggle";

const GOAL_TYPES = [
  { id: "Buy Item", emoji: "🛒" },
  { id: "Travel", emoji: "✈️" },
  { id: "Marriage", emoji: "💍" },
  { id: "Build House", emoji: "🏗️" },
  { id: "Buy Home", emoji: "🏠" },
  { id: "Education", emoji: "🎓" },
  { id: "Emergency", emoji: "🆘" },
  { id: "Vehicle", emoji: "🚗" },
  { id: "Investment", emoji: "📈" },
  { id: "Long term Savings", emoji: "🏦" },
  { id: "Goals", emoji: "🎯" },
  { id: "Other", emoji: "📦" },
];

const STATUSES = [
  "Planning",
  "Progress",
  "Ongoing",
  "In Progress",
  "Paused",
  "Completed",
  "Accomplished",
  "Cancelled",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PAGE_SIZES = [10, 20, 50];

const STATUS_TONE = {
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  Progress: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Ongoing: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "In Progress": "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Paused:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Accomplished:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const PRIORITY_TONE = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Critical: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const emptyForm = (currency) => ({
  title: "",
  description: "",
  goalType: "Buy Item",
  targetAmount: "",
  currency,
  currentFunding: "0",
  status: "Planning",
  priority: "Medium",
  targetDate: "",
  noted: "",
});

const Plans = () => {
  useDocumentTitle("Plans");
  const { t, tEnum } = useI18n();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_plans") || "grid",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency));

  // Investment return modal state
  const [showReturn, setShowReturn] = useState(false);
  const [returnPlan, setReturnPlan] = useState(null);
  const [returnForm, setReturnForm] = useState({
    amount: "",
    currency: "USD",
    date: new Date().toISOString().slice(0, 10),
    kind: "profit",
    noted: "",
    markCompleted: false,
    createExpense: false,
  });

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_plans", v);
  };

  const activeFilterCount = [
    typeFilter,
    statusFilter,
    priorityFilter,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setTypeFilter("");
    setStatusFilter("");
    setPriorityFilter("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/plans", { params });
      let list = data.data?.items || [];
      if (typeFilter) list = list.filter((x) => x.goalType === typeFilter);
      if (priorityFilter)
        list = list.filter((x) => x.priority === priorityFilter);
      setItems(list);
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, priorityFilter]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const note = (item.noted || "").toLowerCase();
      const gtype = (item.goalType || "").toLowerCase();
      const amount = String(item.targetAmount ?? "");
      return (
        title.includes(q) ||
        desc.includes(q) ||
        note.includes(q) ||
        gtype.includes(q) ||
        amount.includes(q)
      );
    });
  }, [items, filterSearch]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, priorityFilter, filterSearch]);

  const rangeFrom = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = Math.min(safePage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const summary = useMemo(() => {
    const totalTarget = filteredItems.reduce(
      (s, i) => s + (Number(i.targetAmountUSD) || Number(i.targetAmount) || 0),
      0,
    );
    const totalFunded = filteredItems.reduce(
      (s, i) =>
        s + (Number(i.currentFundingUSD) ?? Number(i.currentFunding) ?? 0),
      0,
    );
    return { count: filteredItems.length, totalTarget, totalFunded };
  }, [filteredItems]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(displayCurrency));
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      goalType: item.goalType || "Other",
      targetAmount: String(item.targetAmount ?? ""),
      currency: item.currency || displayCurrency,
      currentFunding: String(item.currentFunding ?? 0),
      status: item.status || "Planning",
      priority: item.priority || "Medium",
      targetDate: item.targetDate
        ? new Date(item.targetDate).toISOString().slice(0, 10)
        : "",
      noted: item.noted || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetAmount: Number(form.targetAmount),
        currentFunding: Number(form.currentFunding) || 0,
      };
      if (editing) {
        const { data } = await api.put(`/plans/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/plans", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/plans");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/plans/${confirmDel}`);
        toast.success(data.message || t("success"));
      }
      setConfirmDel(null);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const openReturn = (item) => {
    setReturnPlan(item);
    setReturnForm({
      amount: "",
      currency: item.currency || displayCurrency,
      date: new Date().toISOString().slice(0, 10),
      kind: "profit",
      noted: "",
      markCompleted: false,
      createExpense: false,
    });
    setShowReturn(true);
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/plans/export");
      if (!items || items.length === 0) {
        toast.error(t("noDataToExport"));
        return;
      }
      const exportData = (data.data || []).map((i) => ({
        Title: i.title,
        Description: i.description,
        GoalType: i.goalType,
        TargetAmount: i.targetAmount,
        Currency: i.currency,
        CurrentFunding: i.currentFunding,
        Status: i.status,
        Priority: i.priority,
        TargetDate: i.targetDate ? i.targetDate.slice(0, 10) : "",
        Noted: i.noted,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plans");
      XLSX.writeFile(
        workbook,
        `Plans_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const parsedData = XLSX.utils.sheet_to_json(
          workbook.Sheets[firstSheet],
        );

        const res = await api.post("/plans/import", { items: parsedData });
        toast.success(res.data.message || t("success"));
        fetchData({ silent: true });
      } catch (err) {
        toast.error(err.response?.data?.message || t("failed"));
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnPlan) return;
    try {
      const { data } = await api.post(`/plans/${returnPlan._id}/returns`, {
        amount: Number(returnForm.amount),
        currency: returnForm.currency,
        date: returnForm.date,
        kind: returnForm.kind,
        noted: returnForm.noted,
        markCompleted: returnForm.markCompleted,
        createExpense: returnForm.createExpense,
      });
      toast.success(data.message || t("success"));
      setShowReturn(false);
      setReturnPlan(null);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    }
  };

  const goalLabel = (id) => {
    const g = GOAL_TYPES.find((x) => x.id === id);
    return g ? `${g.emoji} ${tEnum(g.id)}` : tEnum(id);
  };

  const goalEmoji = (id) => {
    const g = GOAL_TYPES.find((x) => x.id === id);
    return g?.emoji || "🎯";
  };

  const statusLabel = (s) => {
    const map = {
      Planning: t("planning") || "Planning",
      Progress: t("progress") || "Progress",
      Ongoing: t("ongoing") || "Ongoing",
      Completed: t("completed") || "Completed",
      "In Progress": t("inProgress"),
      Paused: t("paused"),
      Accomplished: t("accomplished"),
      Cancelled: t("cancelled"),
    };
    return map[s] || s;
  };

  const priorityLabel = (p) => {
    const map = {
      Low: t("low"),
      Medium: t("medium"),
      High: t("high"),
      Critical: t("critical"),
    };
    return map[p] || tEnum(p) || p;
  };

  const progress = (item) => {
    const target = item.targetAmountUSD || item.targetAmount || 1;
    const funded = item.currentFundingUSD ?? item.currentFunding ?? 0;
    return Math.min(100, Math.round((funded / target) * 100));
  };

  // Styled design tokens matching ExchangeLog
  const inputCls =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm transition font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400";
  const cardCls =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200";
  const btnSecondary =
    "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm text-sm font-semibold transition active:scale-[0.98]";
  const btnPrimary =
    "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98]";

  const PaginationBar = () =>
    totalItems === 0 ? null : (
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {t("showing")}{" "}
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
            {rangeFrom}–{rangeTo}
          </span>{" "}
          {t("of")}{" "}
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
            {totalItems}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / {t("page")}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-[2rem] h-7 px-2 rounded-lg text-xs font-bold tabular-nums transition ${
                  n === safePage
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full min-h-full space-y-6 pb-12">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Hero Banner Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("plans")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {summary.count} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("plansHint")} · {displayCurrency}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setViewMode} />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md text-sm font-semibold transition active:scale-[0.98]"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">{t("import") || "Import"}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md text-sm font-semibold transition active:scale-[0.98]"
          >
            <Download size={15} />
            <span className="hidden sm:inline">{t("export") || "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDel("all")}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">{t("deleteAll")}</span>
          </button>

          <button type="button" onClick={openCreate} className={btnPrimary}>
            <Plus size={16} />
            {t("newPlan")}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Target size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("targetAmount")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(summary.totalTarget, displayCurrency, rates)}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("currentFunding")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(summary.totalFunded, displayCurrency, rates)}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Toggle */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t("plansOverview")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondary} relative`}
        >
          <Filter size={15} />
          <span>{t("filters")}</span>
          {activeFilterCount > 0 && (
            <span className="min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Drawer */}
      {showFilters && (
        <div className={`${cardCls} rounded-2xl p-4 space-y-4`}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Filter size={14} className="text-teal-600" />
              {t("advancedFilters")}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw size={12} /> {t("clearAll")}
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder={`${t("searchNote")}, ${t("description")}, ${t("type")}, ${t("amount")}…`}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("goalType")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium mt-1"
              >
                <option value="">{t("all")}</option>
                {GOAL_TYPES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {tEnum(g.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium mt-1"
              >
                <option value="">{t("all")}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("priority")}
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium mt-1"
              >
                <option value="">{t("all")}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick type chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setTypeFilter("")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                !typeFilter
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("all")}
            </button>
            {GOAL_TYPES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setTypeFilter((cur) => (cur === g.id ? "" : g.id))
                }
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                  typeFilter === g.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {g.emoji} {tEnum(g.id)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t("noData")}
          hint={t("plansHint")}
          action={
            activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className={btnSecondary}
              >
                {t("clearFilters")}
              </button>
            ) : (
              <button type="button" onClick={openCreate} className={btnPrimary}>
                {t("newPlan")}
              </button>
            )
          }
        />
      ) : view === "table" ? (
        <div className={`${cardCls} rounded-3xl p-2 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4">{t("title")}</th>
                  <th className="p-4">{t("goalType")}</th>
                  <th className="p-4">{t("targetAmount")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">%</th>
                  <th className="p-4 text-right">{t("actions)")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {pagedItems.map((item) => {
                  const pct = progress(item);
                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-teal-500/5 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold">
                          {goalLabel(item.goalType)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(
                            item.targetAmountUSD || item.targetAmount,
                            displayCurrency,
                            rates,
                          )}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums font-medium mt-0.5">
                          {formatMoney(
                            item.currentFundingUSD ?? item.currentFunding ?? 0,
                            displayCurrency,
                            rates,
                          )}{" "}
                          funded
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                            STATUS_TONE[item.status] || STATUS_TONE.Planning
                          }`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-500">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {item.goalType === "Investment" && (
                            <button
                              type="button"
                              onClick={() => openReturn(item)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition"
                              title={t("addReturn") || "Add return"}
                            >
                              <TrendingUp size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(item._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar />
        </div>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedItems.map((item) => {
              const pct = progress(item);
              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-3xl p-5 relative group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                        {goalLabel(item.goalType)}
                      </span>
                      {item.targetDate && (
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(item.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-lg text-slate-900 dark:text-white truncate mb-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 font-medium">
                        {item.description}
                      </p>
                    )}

                    <div className="my-3">
                      <div className="flex justify-between items-baseline text-xs mb-1">
                        <span className="font-bold text-slate-400 uppercase">
                          Funding
                        </span>
                        <span className="font-bold text-slate-500 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-sm mb-1.5 tabular-nums">
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatMoney(
                            item.currentFundingUSD ?? item.currentFunding ?? 0,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          {formatMoney(
                            item.targetAmountUSD || item.targetAmount,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 my-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                          STATUS_TONE[item.status] || STATUS_TONE.Planning
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                          PRIORITY_TONE[item.priority] || PRIORITY_TONE.Medium
                        }`}
                      >
                        {priorityLabel(item.priority)}
                      </span>
                    </div>

                    {item.goalType === "Investment" && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                          {t("totalGain") || "Total gained"}:{" "}
                          {formatMoney(
                            item.totalGainUSD || 0,
                            displayCurrency,
                            rates,
                          )}
                          <span className="text-slate-400 font-normal">
                            {" "}
                            ({(item.investmentReturns || []).length}{" "}
                            {t("entries") || "entries"})
                          </span>
                        </div>
                        {Number(item.totalBorrowedFromGainUSD) > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                            {t("borrowedFromGain") || "Borrowed from gain"}:{" "}
                            {formatMoney(
                              item.totalBorrowedFromGainUSD,
                              displayCurrency,
                              rates,
                            )}
                          </div>
                        )}
                        {(item.investmentReturns || []).length > 0 && (
                          <ul className="space-y-1 max-h-28 overflow-y-auto mt-1">
                            {[...(item.investmentReturns || [])]
                              .slice(-5)
                              .reverse()
                              .map((r) => (
                                <li
                                  key={r._id}
                                  className="text-[11px] text-slate-500 flex justify-between gap-2"
                                >
                                  <span>
                                    {r.date
                                      ? new Date(r.date).toLocaleDateString()
                                      : "—"}{" "}
                                    · {r.kind}
                                  </span>
                                  <span
                                    className={
                                      Number(r.amountUSD) >= 0
                                        ? "text-emerald-600"
                                        : "text-rose-500"
                                    }
                                  >
                                    {formatOriginal(r.amount, r.currency)}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-end gap-2">
                    {item.goalType === "Investment" && (
                      <button
                        type="button"
                        onClick={() => openReturn(item)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 font-bold inline-flex items-center gap-1 transition"
                        title={t("addReturn") || "Add return"}
                      >
                        <TrendingUp size={13} /> {t("gain") || "Gain"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(item._id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationBar />
        </>
      ) : (
        <>
          <div className="space-y-3">
            {pagedItems.map((item) => {
              const pct = progress(item);
              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-2xl p-4 flex items-center justify-between gap-4 group`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 text-xl font-bold">
                      {goalEmoji(item.goalType)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                        <span>{item.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                            STATUS_TONE[item.status] || STATUS_TONE.Planning
                          }`}
                        >
                          {statusLabel(item.status)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                            PRIORITY_TONE[item.priority] || PRIORITY_TONE.Medium
                          }`}
                        >
                          {priorityLabel(item.priority)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {formatMoney(
                          item.currentFundingUSD ?? item.currentFunding ?? 0,
                          displayCurrency,
                          rates,
                        )}{" "}
                        /{" "}
                        {formatMoney(
                          item.targetAmountUSD || item.targetAmount,
                          displayCurrency,
                          rates,
                        )}{" "}
                        • {goalLabel(item.goalType)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    {item.goalType === "Investment" && (
                      <button
                        type="button"
                        onClick={() => openReturn(item)}
                        className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition"
                        title={t("addReturn") || "Add return"}
                      >
                        <TrendingUp size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(item._id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <PaginationBar />
        </>
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        size="lg"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>{editing ? t("edit") : t("newPlan")}</Modal.Header>
        <Modal.Body>
          <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("title")}
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder={t("goalTitlePlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("goalType")}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm({ ...form, goalType: g.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-[0.98] ${
                      form.goalType === g.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-teal-500"
                    }`}
                  >
                    {g.emoji} {tEnum(g.id)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className={inputCls}
                placeholder={t("goalDescPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("targetAmount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm({ ...form, targetAmount: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("currency")}
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                  <option value="THB">THB</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("currentFunding")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.currentFunding}
                  onChange={(e) =>
                    setForm({ ...form, currentFunding: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("date")}
                </label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("status")}
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("priority")}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className={inputCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("note")}
              </label>
              <textarea
                value={form.noted}
                onChange={(e) => setForm({ ...form, noted: e.target.value })}
                rows={2}
                className={inputCls}
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            disabled={saving}
            onClick={closeForm}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="plan-form"
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? t("loading") : t("save")}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Investment Return Modal */}
      <Modal open={showReturn} onClose={() => setShowReturn(false)} size="sm">
        <Modal.Header>
          {t("addReturn") || "Add return"} — {returnPlan?.title}
        </Modal.Header>
        <Modal.Body>
          <form id="return-form" onSubmit={handleReturn} className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              {t("totalGain") || "Total gained"}:{" "}
              {returnPlan
                ? formatMoney(
                    returnPlan.totalGainUSD || 0,
                    displayCurrency,
                    rates,
                  )
                : "—"}
            </p>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("amount")}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={returnForm.amount}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, amount: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("currency")}
                </label>
                <select
                  value={returnForm.currency}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, currency: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                  <option value="THB">THB</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("date")}
                </label>
                <input
                  type="date"
                  value={returnForm.date}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, date: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("kind") || "Type"}
              </label>
              <select
                value={returnForm.kind}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, kind: e.target.value })
                }
                className={inputCls}
              >
                <option value="profit">Profit → Saving + Budget</option>
                <option value="dividend">Dividend → Saving + Budget</option>
                <option value="deposit">Deposit → Saving + funding</option>
                <option value="sale">Sale → Saving + Budget</option>
                <option value="borrow">Borrow from saving (info)</option>
                <option value="other">Other → Saving</option>
              </select>
            </div>
            {returnForm.kind === "borrow" && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={returnForm.createExpense}
                  onChange={(e) =>
                    setReturnForm({
                      ...returnForm,
                      createExpense: e.target.checked,
                    })
                  }
                />
                {t("createExpense") || "Also create Expense (everyday spend)"}
              </label>
            )}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("note")}
              </label>
              <input
                value={returnForm.noted}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, noted: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={returnForm.markCompleted}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    markCompleted: e.target.checked,
                  })
                }
              />
              {t("markCompleted") || "Mark plan Completed"}
            </label>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setShowReturn(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button type="submit" form="return-form" className={btnPrimary}>
            {t("save")}
          </button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDelete}
        loading={deleting}
        title={confirmDel === "all" ? t("deleteAll") : t("delete")}
        message={
          confirmDel === "all" ? t("confirmDeleteAll") : t("confirmDelete")
        }
      />
    </div>
  );
};

export default Plans;
