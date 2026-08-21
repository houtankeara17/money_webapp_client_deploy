import { useEffect, useState, useMemo, useRef } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
  Upload,
  Calendar,
  Wallet,
  PiggyBank,
  Send,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import useI18n from "../hooks/useI18n";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const MONTHS = [
  { n: 1, name: "January" },
  { n: 2, name: "February" },
  { n: 3, name: "March" },
  { n: 4, name: "April" },
  { n: 5, name: "May" },
  { n: 6, name: "June" },
  { n: 7, name: "July" },
  { n: 8, name: "August" },
  { n: 9, name: "September" },
  { n: 10, name: "October" },
  { n: 11, name: "November" },
  { n: 12, name: "December" },
];

const PAGE_SIZES = [10, 20, 50];

const emptyForm = (currency, year) => ({
  year,
  monthNumber: new Date().getMonth() + 1,
  currency,
  plannedIncome: "",
  savingsAmount: "",
  remittanceAmount: "",
  spendingAmount: "",
  noted: "",
});

const Budgets = () => {
  useDocumentTitle("Budgets");
  const { t, tMonth } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const currentYear = new Date().getFullYear();

  const [timeTab, setTimeTab] = useState("monthly"); // "monthly" | "yearly" | "alltime"
  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState([]);
  const [yearSummary, setYearSummary] = useState({
    totalPlannedUSD: 0,
    totalEnvelopesUSD: 0,
    count: 0,
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_budgets") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_budgets", v);
  };

  const activeFilterCount = [filterMonth, filterSearch.trim()].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setFilterMonth("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async (
    y = year,
    mode = timeTab,
    { silent = false } = {},
  ) => {
    if (!silent) setLoading(true);
    try {
      const params = { limit: 100 };
      if (mode !== "alltime") {
        params.year = y;
      }
      if (mode === "monthly" && filterMonth) {
        params.monthNumber = filterMonth;
      }
      const { data } = await api.get("/budgets", { params });
      const list = data.data?.items || [];
      setItems(list);

      const summary = data.data?.yearSummary || {
        totalPlannedUSD: list.reduce(
          (s, i) => s + (Number(i.plannedIncomeUSD) || 0),
          0,
        ),
        totalEnvelopesUSD: list.reduce(
          (s, i) =>
            s +
            (Number(i.savingsAmountUSD) || 0) +
            (Number(i.remittanceAmountUSD) || 0) +
            (Number(i.spendingAmountUSD) || 0),
          0,
        ),
        count: list.length,
      };
      setYearSummary(summary);
      setAvailableYears(data.data?.availableYears || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year, timeTab);
  }, [year, timeTab, filterMonth]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const note = (item.noted || "").toLowerCase();
      const month = (
        item.month ||
        MONTHS.find((m) => m.n === item.monthNumber)?.name ||
        ""
      ).toLowerCase();
      const income = String(item.plannedIncome ?? "");
      return note.includes(q) || month.includes(q) || income.includes(q);
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
  }, [filterMonth, filterSearch, timeTab]);

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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(displayCurrency, year));
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      year: item.year,
      monthNumber: item.monthNumber,
      currency: item.currency || displayCurrency,
      plannedIncome: String(item.plannedIncome ?? ""),
      savingsAmount: String(item.savingsAmount ?? ""),
      remittanceAmount: String(item.remittanceAmount ?? ""),
      spendingAmount: String(item.spendingAmount ?? ""),
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
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        currency: form.currency,
        plannedIncome: Number(form.plannedIncome) || 0,
        savingsAmount: Number(form.savingsAmount) || 0,
        remittanceAmount: Number(form.remittanceAmount) || 0,
        spendingAmount: Number(form.spendingAmount) || 0,
        noted: form.noted || "",
      };
      if (editing) {
        const { data } = await api.put(`/budgets/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/budgets", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData(year, timeTab, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => setConfirmDel(id);
  const handleDeleteAll = () => setConfirmDel("all");

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/budgets");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/budgets/${confirmDel}`);
        toast.success(data.message || t("success"));
      }
      setConfirmDel(null);
      fetchData(year, timeTab, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const { data } = await api.get("/budgets/export");
      const rawItems = data.data || [];

      if (rawItems.length === 0) {
        toast.error(t("noData"));
        return;
      }

      const formattedData = rawItems.map((item) => ({
        Year: item.year,
        Month: item.monthNumber,
        Currency: item.currency || "USD",
        PlannedIncome: item.plannedIncome || 0,
        SavingsAmount: item.savingsAmount || 0,
        RemittanceAmount: item.remittanceAmount || 0,
        SpendingAmount: item.spendingAmount || 0,
        Noted: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Budgets");

      XLSX.writeFile(workbook, `budgets-${Date.now()}.xlsx`);
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const parsedData = XLSX.utils.sheet_to_json(worksheet);

      if (!parsedData || parsedData.length === 0) {
        toast.error(t("noData"));
        return;
      }

      const { data } = await api.post("/budgets/import", { items: parsedData });
      toast.success(data.message || t("success"));
      fetchData(year, timeTab, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      e.target.value = "";
    }
  };

  const monthLabel = (item) =>
    item.month ||
    MONTHS.find((m) => m.n === item.monthNumber)?.name ||
    item.monthNumber;

  const envelopeTotal = (item) =>
    (Number(item.savingsAmountUSD) || 0) +
    (Number(item.remittanceAmountUSD) || 0) +
    (Number(item.spendingAmountUSD) || 0);

  // Modern UI Classes directly matching ExchangeLog design theme
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
        onChange={handleImport}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("budgets") || "Budgets"}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {yearSummary.count} {t("entries") || "entries"}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("budgetSubtitle") || "Monthly income & envelope plan"} ·{" "}
            <span className="font-semibold text-teal-300">
              {displayCurrency}
            </span>
          </p>
        </div>

        {/* Action Controls */}
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
            <span className="hidden sm:inline">{t("export")}</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">{t("deleteAll")}</span>
          </button>

          <button type="button" onClick={openCreate} className={btnPrimary}>
            <Plus size={16} />
            {t("addBudget") || "Add Budget"}
          </button>
        </div>
      </div>

      {/* Overview Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("plannedIncome") || "Planned Income"}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(
                yearSummary.totalPlannedUSD || 0,
                displayCurrency,
                rates,
              )}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <PieChart size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("totalAllocated") || "Total Allocated Envelopes"}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(
                yearSummary.totalEnvelopesUSD || 0,
                displayCurrency,
                rates,
              )}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("activePeriod") || "Selected Period"}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate">
              {timeTab === "alltime" ? t("allTime") : `${year}`}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Timeframe & Filtering */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80">
            {["monthly", "yearly", "alltime"].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeTab(tf)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  timeTab === tf
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t(tf === "alltime" ? "allTime" : tf)}
              </button>
            ))}
          </div>

          {/* Year Navigator (Hidden for 'alltime') */}
          {timeTab !== "alltime" && (
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 p-1">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setYear((y) => y - 1)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold tabular-nums w-12 text-center text-slate-900 dark:text-white">
                {year}
              </span>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
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

      {/* Advanced Filters Panel */}
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
                <RotateCcw size={12} /> {t("clearFilters")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder={`${t("searchMonth")}, ${t("month")}, ${t("incomePlan")}`}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>

            {timeTab === "monthly" && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">{t("all") || "All Months"}</option>
                {MONTHS.map((m) => (
                  <option key={m.n} value={m.n}>
                    {tMonth ? tMonth(m.n) : m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {timeTab === "monthly" && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setFilterMonth("")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  !filterMonth
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t("all") || "All"}
              </button>
              {MONTHS.map((m) => (
                <button
                  key={m.n}
                  type="button"
                  onClick={() =>
                    setFilterMonth((cur) =>
                      String(cur) === String(m.n) ? "" : String(m.n),
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    String(filterMonth) === String(m.n)
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tMonth ? tMonth(m.n) : m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title={t("noData")}
          hint={t("budgetEmptyHint") || t("noDataHint")}
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
                {t("addBudget") || "Add Budget"}
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
                  <th className="p-4">{t("month") || "Month"}</th>
                  <th className="p-4">{t("plannedIncome") || "Income"}</th>
                  <th className="p-4 hidden sm:table-cell">{t("savings")}</th>
                  <th className="p-4 hidden md:table-cell">
                    {t("remittances")}
                  </th>
                  <th className="p-4 hidden md:table-cell">
                    {t("spendingEnvelope") || "Spending"}
                  </th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {pagedItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-teal-500/5 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {monthLabel(item)} {item.year}
                      </div>
                      {item.noted && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">
                          {item.noted}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {formatOriginal(item.plannedIncome, item.currency)}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums font-semibold">
                        {formatMoney(
                          item.plannedIncomeUSD,
                          displayCurrency,
                          rates,
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.savingsAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.remittanceAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {formatMoney(
                        item.spendingAmountUSD,
                        displayCurrency,
                        rates,
                      )}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar />
        </div>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedItems.map((item) => {
              const totalEnv = envelopeTotal(item);
              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-3xl p-5 relative group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                      <div>
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">
                          {monthLabel(item)} {item.year}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t("plannedIncome") || "Income"}:{" "}
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {formatMoney(
                              item.plannedIncomeUSD,
                              displayCurrency,
                              rates,
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                      <div className="rounded-2xl bg-teal-500/10 p-2.5 border border-teal-500/10">
                        <PiggyBank
                          size={14}
                          className="mx-auto mb-1 text-teal-600 dark:text-teal-400"
                        />
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {t("savings")}
                        </div>
                        <div className="font-extrabold tabular-nums text-slate-900 dark:text-white mt-0.5">
                          {formatMoney(
                            item.savingsAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-indigo-500/10 p-2.5 border border-indigo-500/10">
                        <Send
                          size={14}
                          className="mx-auto mb-1 text-indigo-600 dark:text-indigo-400"
                        />
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {t("remittances")}
                        </div>
                        <div className="font-extrabold tabular-nums text-slate-900 dark:text-white mt-0.5">
                          {formatMoney(
                            item.remittanceAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-amber-500/10 p-2.5 border border-amber-500/10">
                        <ShoppingBag
                          size={14}
                          className="mx-auto mb-1 text-amber-600 dark:text-amber-400"
                        />
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {t("spendingEnvelope") || "Spending"}
                        </div>
                        <div className="font-extrabold tabular-nums text-slate-900 dark:text-white mt-0.5">
                          {formatMoney(
                            item.spendingAmountUSD,
                            displayCurrency,
                            rates,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <span>{t("total") || "Total Allocations"}:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatMoney(totalEnv, displayCurrency, rates)}
                      </span>
                    </div>
                    {item.noted && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 italic bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl">
                        "{item.noted}"
                      </p>
                    )}
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
              const totalEnv = envelopeTotal(item);
              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-2xl p-4 flex items-center justify-between gap-4 group`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <PieChart size={20} />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                        <span>
                          {monthLabel(item)} {item.year}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-2">
                          {formatMoney(
                            item.plannedIncomeUSD,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          {t("savings")}:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {formatMoney(
                              item.savingsAmountUSD,
                              displayCurrency,
                              rates,
                            )}
                          </strong>
                        </span>
                        <span>
                          {t("remittances")}:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {formatMoney(
                              item.remittanceAmountUSD,
                              displayCurrency,
                              rates,
                            )}
                          </strong>
                        </span>
                        <span>
                          {t("spendingEnvelope") || "Spend"}:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {formatMoney(
                              item.spendingAmountUSD,
                              displayCurrency,
                              rates,
                            )}
                          </strong>
                        </span>
                      </div>
                      {item.noted && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                          {item.noted}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/40">
                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
                      <div className="text-[10px] uppercase tracking-wider font-bold">
                        {t("total") || "Total"}
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatMoney(totalEnv, displayCurrency, rates)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
        size="md"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>
          {editing ? t("edit") : t("addBudget") || "Add Budget"}
        </Modal.Header>
        <Modal.Body>
          <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("year")}
                </label>
                <input
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("month") || "Month"}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) =>
                    setForm({ ...form, monthNumber: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {tMonth ? tMonth(m.n) : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("currency")}
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                <option value="USD">USD</option>
                <option value="KHR">KHR</option>
                <option value="THB">THB</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("plannedIncome") || "Planned income (salary + bonus)"}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.plannedIncome}
                onChange={(e) =>
                  setForm({ ...form, plannedIncome: e.target.value })
                }
                className={inputCls}
                placeholder="600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("savings")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.savingsAmount}
                  onChange={(e) =>
                    setForm({ ...form, savingsAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("remittances")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.remittanceAmount}
                  onChange={(e) =>
                    setForm({ ...form, remittanceAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("spendingEnvelope") || "Spending"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.spendingAmount}
                  onChange={(e) =>
                    setForm({ ...form, spendingAmount: e.target.value })
                  }
                  className={inputCls}
                  placeholder="200"
                />
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
                placeholder=""
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
            form="budget-form"
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? t("loading") : t("save")}
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

export default Budgets;
