import { useEffect, useState, useMemo, useRef } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Gift,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
  Wallet,
  CheckCircle2,
  Calendar,
  CreditCard,
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
import * as XLSX from "xlsx";

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
const STATUSES = ["Draft", "Confirmed", "Disbursed"];
const PAGE_SIZES = [10, 20, 50];
const TAGS = [
  "Performance",
  "Holiday",
  "Project",
  "Annual",
  "Referral",
  "Other",
];
const PAYMENTS = [
  "Cash",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Transfer",
  "Other",
];

const TAG_TONE = {
  Performance:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
  Holiday:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  Project:
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  Annual:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  Referral:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  Other:
    "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
};

const STATUS_TONE = {
  Disbursed:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  Confirmed:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
  Draft:
    "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
};

const emptyForm = (currency, year) => ({
  amount: "",
  currency,
  year,
  monthNumber: new Date().getMonth() + 1,
  status: "Confirmed",
  tag: "Performance",
  paymentMethod: "ABA Bank",
  noted: "",
});

const Bonus = () => {
  useDocumentTitle("Bonus");
  const { t, tEnum, tMonth } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const statusLabel = (s) => {
    if (s === "Confirmed") return t("confirmed");
    if (s === "Draft") return t("draft");
    if (s === "Disbursed") return t("disbursed");
    return s;
  };

  const fileInputRef = useRef(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Period management states
  const [period, setPeriod] = useState("yearly"); // "monthly" | "yearly" | "all"
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const [items, setItems] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearSummary, setYearSummary] = useState({
    totalUSD: 0,
    confirmedUSD: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [linkedSalary, setLinkedSalary] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_bonus") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_bonus", v);
  };

  const activeFilterCount = [
    filterStatus,
    filterMonth,
    filterTag,
    filterPayment,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterMonth("");
    setFilterTag("");
    setFilterPayment("");
    setFilterSearch("");
    setPage(1);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const monthName = (n) =>
    tMonth ? tMonth(n) : MONTHS.find((m) => m.n === Number(n))?.name || n;

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { limit: 100, period };
      if (period !== "all") {
        params.year = year;
      }
      if (period === "monthly") {
        params.monthNumber = month;
      }

      if (filterTag) params.tag = filterTag;
      if (filterStatus) params.status = filterStatus;
      if (filterMonth && period !== "monthly")
        params.monthNumber = Number(filterMonth);
      if (filterPayment) params.paymentMethod = filterPayment;

      const { data } = await api.get("/bonuses", { params });
      setItems(data.data.items || []);
      setAvailableYears(data.data.availableYears || []);
      setYearSummary(
        data.data.yearSummary || { totalUSD: 0, confirmedUSD: 0, count: 0 },
      );
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    period,
    year,
    month,
    filterTag,
    filterStatus,
    filterMonth,
    filterPayment,
  ]);

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
      const tag = (item.tag || "").toLowerCase();
      const pay = (item.paymentMethod || "").toLowerCase();
      const amount = String(item.amount ?? "");
      return (
        note.includes(q) ||
        tag.includes(q) ||
        pay.includes(q) ||
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
  }, [filterStatus, filterMonth, filterPayment, filterSearch, filterTag]);

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

  const fetchLinkedSalary = async (y, m) => {
    setLoadingSalary(true);
    try {
      const { data } = await api.get("/salaries", {
        params: { year: y, monthNumber: m, limit: 5 },
      });
      const list = data.data?.items || [];
      setLinkedSalary(list[0] || null);
    } catch {
      setLinkedSalary(null);
    } finally {
      setLoadingSalary(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    const mn = new Date().getMonth() + 1;
    setForm(emptyForm(displayCurrency, year));
    setForm((f) => ({ ...f, monthNumber: mn, year }));
    setShowForm(true);
    fetchLinkedSalary(year, mn);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      year: item.year || year,
      monthNumber: item.monthNumber || 1,
      status: item.status || "Confirmed",
      tag: item.tag || "Performance",
      paymentMethod: item.paymentMethod || "ABA Bank",
      noted: item.noted || "",
    });
    setShowForm(true);
    fetchLinkedSalary(item.year || year, item.monthNumber || 1);
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
        amount: Number(form.amount),
        currency: form.currency,
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        status: form.status,
        tag: form.tag,
        paymentMethod: form.paymentMethod,
        noted: form.noted || "",
      };
      if (editing) {
        const { data } = await api.put(`/bonuses/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/bonuses", payload);
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

  const handleDelete = (id) => setConfirmDel(id);
  const handleDeleteAll = () => setConfirmDel("all");

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/bonuses");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/bonuses/${confirmDel}`);
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

  const handleExport = async () => {
    try {
      const { data } = await api.get("/bonuses/export");
      const rawItems = data.data || [];

      if (!items || items.length === 0) {
        toast.error(t("noDataToExport"));
        return;
      }

      const formattedData = rawItems.map((item) => ({
        Year: item.year,
        Month: item.monthNumber,
        Amount: item.amount,
        Currency: item.currency,
        Tag: item.tag,
        Status: item.status,
        PaymentMethod: item.paymentMethod,
        Noted: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bonuses");

      XLSX.writeFile(workbook, `bonuses-${Date.now()}.xlsx`);
      toast.success(t("export"));
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
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

      const { data } = await api.post("/bonuses/import", { items: parsedData });
      toast.success(data.message || t("success"));
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      e.target.value = null;
    }
  };

  // Modern UI Classes identical to ExchangeLog
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
              {t("bonus")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {yearSummary.count} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("monitorOverviewBonus")}
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
            <span className="hidden sm:inline">{t("import")}</span>
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
            {t("addBonus")}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("total")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(yearSummary.totalUSD || 0, displayCurrency, rates)}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("confirmedTotal")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(
                yearSummary.confirmedUSD || 0,
                displayCurrency,
                rates,
              )}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Gift size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("totalEntries")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {yearSummary.count} {t("entries")}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Timeframe & Filtering */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80">
            {["monthly", "yearly", "all"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  period === p
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t(p === "all" ? "allTime" : p)}
              </button>
            ))}
          </div>

          {period === "monthly" && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            >
              {MONTHS.map((m) => (
                <option key={m.n} value={m.n}>
                  {monthName(m.n)}
                </option>
              ))}
            </select>
          )}

          {period !== "all" && (
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-4">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder={`${t("searchNote")} ${t("tag")} ${t("amount")}…`}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("status")}: {t("all")}
                </option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {period !== "monthly" && (
              <div>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                >
                  <option value="">
                    {t("month")}: {t("all")}
                  </option>
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {monthName(m.n)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("tag")} {t("all")}
                </option>
                {TAGS.map((tg) => (
                  <option key={tg} value={tg}>
                    {tEnum ? tEnum(tg) : tg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("paymentMethod")} {t("all")}
                </option>
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
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
          icon={Gift}
          title={t("noData")}
          hint={t("noDataHint")}
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
                {t("addBonus")}
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
                  <th className="p-4">{t("amount")}</th>
                  <th className="p-4">{t("tag")}</th>
                  <th className="p-4">{t("month")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">{t("paymentMethod")}</th>
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
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatOriginal(item.amount, item.currency)}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 tabular-nums">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          TAG_TONE[item.tag] || TAG_TONE.Other
                        }`}
                      >
                        {tEnum ? tEnum(item.tag) : item.tag}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                        {monthName(item.monthNumber)} {item.year}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          STATUS_TONE[item.status] || STATUS_TONE.Draft
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <CreditCard
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                        {item.paymentMethod || "—"}
                      </div>
                    </td>
                    <td className="p-4 text-right">
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
            {pagedItems.map((item) => (
              <div
                key={item._id}
                className={`${cardCls} rounded-3xl p-5 relative group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        TAG_TONE[item.tag] || TAG_TONE.Other
                      }`}
                    >
                      {tEnum ? tEnum(item.tag) : item.tag}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                        STATUS_TONE[item.status] || STATUS_TONE.Draft
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="my-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Bonus Amount
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                      {formatOriginal(item.amount, item.currency)}
                    </p>
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                      {formatMoney(item.amountUSD, displayCurrency, rates)}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Calendar size={12} /> Date:
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {monthName(item.monthNumber)} {item.year}
                      </span>
                    </div>

                    {item.paymentMethod && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <CreditCard size={12} /> Payment:
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {item.paymentMethod}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.noted && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                      "{item.noted}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-end gap-2">
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
              </div>
            ))}
          </div>
          <PaginationBar />
        </>
      ) : (
        <>
          <div className="space-y-3">
            {pagedItems.map((item) => (
              <div
                key={item._id}
                className={`${cardCls} rounded-2xl p-4 flex items-center justify-between gap-4 group`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Gift size={20} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                      <span>{formatOriginal(item.amount, item.currency)}</span>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">
                        ({formatMoney(item.amountUSD, displayCurrency, rates)})
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          TAG_TONE[item.tag] || TAG_TONE.Other
                        }`}
                      >
                        {tEnum ? tEnum(item.tag) : item.tag}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          STATUS_TONE[item.status] || STATUS_TONE.Draft
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {monthName(item.monthNumber)} {item.year} •{" "}
                      {item.paymentMethod || "—"}
                      {item.noted && ` • "${item.noted}"`}
                    </p>
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
            ))}
          </div>
          <PaginationBar />
        </>
      )}

      {/* Entry Modal Form */}
      <Modal
        open={showForm}
        onClose={closeForm}
        size="full"
        className="h-[90vh] rounded-2xl"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>{editing ? t("edit") : t("addBonus")}</Modal.Header>
        <Modal.Body>
          <form id="bonus-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("amount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                  {t("year")}
                </label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setForm({ ...form, year: y });
                    fetchLinkedSalary(y, Number(form.monthNumber));
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("month")}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) => {
                    const mn = Number(e.target.value);
                    setForm({ ...form, monthNumber: mn });
                    fetchLinkedSalary(Number(form.year), mn);
                  }}
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m.n} value={m.n}>
                      {monthName(m.n)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 text-sm space-y-1.5">
              {loadingSalary ? (
                <p className="text-slate-500 font-medium">{t("loading")}</p>
              ) : linkedSalary ? (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {t("linkedSalary")}
                    </span>
                    <span className="font-bold tabular-nums">
                      {formatOriginal(
                        linkedSalary.amount,
                        linkedSalary.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {t("bonus")}
                    </span>
                    <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                      {form.amount
                        ? formatOriginal(
                            Number(form.amount) || 0,
                            form.currency,
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-teal-500/20 pt-1.5 mt-0.5">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {t("salaryRemaining")}
                    </span>
                    <span className="font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                      {formatOriginal(
                        Math.max(
                          0,
                          Number(linkedSalary.amount) -
                            (Number(form.amount) || 0) +
                            (editing ? Number(editing.amount) || 0 : 0),
                        ),
                        linkedSalary.currency,
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    {t("bonusSalaryHint")}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 font-medium">
                  {t("noSalaryThisMonth")}
                </p>
              )}
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
                  {t("tag")}
                </label>
                <select
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className={inputCls}
                >
                  {TAGS.map((tg) => (
                    <option key={tg} value={tg}>
                      {tEnum ? tEnum(tg) : tg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("paymentMethod")}
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
                className={inputCls}
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
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
            form="bonus-form"
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

export default Bonus;
