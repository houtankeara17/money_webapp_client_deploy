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
  ArrowRightLeft,
  Pencil,
  Sparkles,
  Filter,
  X,
  Search,
  TrendingUp,
  Building2,
  Calendar,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import useI18n from "../hooks/useI18n";
import * as XLSX from "xlsx";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const PROVIDERS = [
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Street Exchange",
  "Airport",
  "Other",
];
const CURRENCIES = ["USD", "KHR", "THB"];
const PAGE_SIZES = [10, 20, 50];

const ExchangeLog = () => {
  useDocumentTitle("Exchange Log");
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [timeframe, setTimeframe] = useState("yearly"); // "monthly" | "yearly" | "alltime"
  const [providerFilter, setProviderFilter] = useState("");
  const [items, setItems] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearSummary, setYearSummary] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_exchange") || "list",
  );

  const [form, setForm] = useState({
    fromCurrency: "USD",
    fromAmount: "",
    toCurrency: "KHR",
    toAmount: "",
    rateUsed: "",
    officialRate: "",
    provider: "ABA Bank",
    exchangeDate: new Date().toISOString().slice(0, 10),
    noted: "",
  });

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_exchange", v);
  };

  const activeFilterCount = [
    providerFilter,
    currencyFilter,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setProviderFilter("");
    setCurrencyFilter("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async (
    y = year,
    prov = providerFilter,
    { silent = false } = {},
  ) => {
    if (!silent) setLoading(true);
    try {
      const params = { year: y, limit: 100 };
      if (prov) params.provider = prov;
      const { data } = await api.get("/exchange-logs", { params });
      setItems(data.data.items || []);
      setAvailableYears(data.data.availableYears || []);
      setYearSummary(data.data.yearSummary || { count: 0 });
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year, providerFilter);
  }, [year, providerFilter]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const updateRate = (fromAmt, toAmt) => {
    const f = Number(fromAmt);
    const to = Number(toAmt);
    if (f > 0 && to > 0) return (to / f).toFixed(4);
    return "";
  };

  const filteredItems = useMemo(() => {
    let result = items;
    const now = new Date();

    if (timeframe === "monthly") {
      const currentMonth = now.getMonth();
      result = result.filter((item) => {
        const d = new Date(item.exchangeDate);
        return d.getFullYear() === year && d.getMonth() === currentMonth;
      });
    } else if (timeframe === "yearly") {
      result = result.filter((item) => {
        const d = new Date(item.exchangeDate);
        return d.getFullYear() === year;
      });
    }

    if (currencyFilter) {
      result = result.filter(
        (item) =>
          item.fromCurrency === currencyFilter ||
          item.toCurrency === currencyFilter,
      );
    }

    const q = filterSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const prov = (item.provider || "").toLowerCase();
        const note = (item.noted || "").toLowerCase();
        const fromC = (item.fromCurrency || "").toLowerCase();
        const toC = (item.toCurrency || "").toLowerCase();
        const fromA = String(item.fromAmount ?? "");
        const toA = String(item.toAmount ?? "");
        const rate = String(item.rateUsed ?? "");
        return (
          prov.includes(q) ||
          note.includes(q) ||
          fromC.includes(q) ||
          toC.includes(q) ||
          fromA.includes(q) ||
          toA.includes(q) ||
          rate.includes(q)
        );
      });
    }

    return result;
  }, [items, timeframe, year, currencyFilter, filterSearch]);

  // Aggregate Metrics for Hero Section
  const metrics = useMemo(() => {
    const totalExchanges = filteredItems.length;
    const totalUSD = filteredItems.reduce((acc, curr) => {
      if (curr.fromCurrency === "USD") return acc + Number(curr.fromAmount);
      return acc;
    }, 0);

    const providerCounts = filteredItems.reduce((acc, curr) => {
      acc[curr.provider] = (acc[curr.provider] || 0) + 1;
      return acc;
    }, {});

    const topProvider =
      Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    return { totalExchanges, totalUSD, topProvider };
  }, [filteredItems]);

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
  }, [timeframe, providerFilter, currencyFilter, filterSearch]);

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
    setForm({
      fromCurrency: "USD",
      fromAmount: "",
      toCurrency: "KHR",
      toAmount: "",
      rateUsed: "",
      officialRate: "",
      provider: "ABA Bank",
      exchangeDate: new Date().toISOString().slice(0, 10),
      noted: "",
    });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      fromCurrency: item.fromCurrency || "USD",
      fromAmount: String(item.fromAmount ?? ""),
      toCurrency: item.toCurrency || "KHR",
      toAmount: String(item.toAmount ?? ""),
      rateUsed: String(item.rateUsed ?? ""),
      officialRate: String(item.officialRate ?? ""),
      provider: item.provider || "ABA Bank",
      exchangeDate: item.exchangeDate
        ? new Date(item.exchangeDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
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
        fromAmount: Number(form.fromAmount),
        toAmount: Number(form.toAmount),
        rateUsed: Number(form.rateUsed),
        officialRate: form.officialRate ? Number(form.officialRate) : null,
      };
      if (editing) {
        const { data } = await api.put(
          `/exchange-logs/${editing._id}`,
          payload,
        );
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/exchange-logs", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      fetchData(year, providerFilter, { silent: true });
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
        const { data } = await api.delete("/exchange-logs");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/exchange-logs/${confirmDel}`);
        toast.success(data.message || t("success"));
      }
      setConfirmDel(null);
      fetchData(year, providerFilter, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    if (!items || items.length === 0) {
      toast.error(t("noDataToExport") || "No data to export");
      return;
    }
    try {
      const exportData = items.map((item) => ({
        "From Currency": item.fromCurrency,
        "From Amount": item.fromAmount,
        "To Currency": item.toCurrency,
        "To Amount": item.toAmount,
        Rate: item.rateUsed,
        "Official Rate": item.officialRate || "",
        Provider: item.provider,
        Date: new Date(item.exchangeDate).toISOString().slice(0, 10),
        Note: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Exchange Logs");
      XLSX.writeFile(workbook, `exchange-logs-${Date.now()}.xlsx`);
      toast.success(t("export"));
    } catch (err) {
      toast.error(err.message || t("failed"));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let jsonItems = [];
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        jsonItems = JSON.parse(text);
        if (!Array.isArray(jsonItems)) jsonItems = [jsonItems];
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonItems = XLSX.utils.sheet_to_json(worksheet);
      }

      const res = await api.post("/exchange-logs/import", { items: jsonItems });
      toast.success(res.data.message || t("success"));
      fetchData(year, providerFilter, { silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || t("failed"));
    } finally {
      e.target.value = "";
    }
  };

  // Modern UI Classes matching Bonus design theme
  const inputCls =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm transition font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400";
  const cardCls =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200";
  const btnSecondary =
    "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm text-sm font-semibold transition active:scale-[0.98]";
  const btnDanger =
    "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-sm font-semibold transition active:scale-[0.98]";
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
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv, .json"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("exchange")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {yearSummary.count} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("monitorExchangeRate")}
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
            {t("logExchange")}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("filteredRecords")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {metrics.totalExchanges}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              USD {t("Outflow")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              ${metrics.totalUSD.toLocaleString()}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("topExchangeSource")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {metrics.topProvider}
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
            {["monthly", "yearly", "alltime"].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  timeframe === tf
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t(tf === "alltime" ? "allTime" : tf)}
              </button>
            ))}
          </div>

          {timeframe !== "alltime" && (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder={`${t("provider")}, ${t("note")}…`}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>

            <div>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("provider")}: {t("all")}
                </option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("currency")}: {t("all")}
                </option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
          icon={ArrowRightLeft}
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
                {t("logExchange")}
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
                  <th className="p-4">{t("from")}</th>
                  <th className="p-4">{t("to")}</th>
                  <th className="p-4">{t("rate")}</th>
                  <th className="p-4">{t("provider")}</th>
                  <th className="p-4">{t("date")}</th>
                  <th className="p-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {pagedItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-teal-500/5 transition-colors group"
                  >
                    <td className="p-4 font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {item.fromAmount.toLocaleString()}{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        {item.fromCurrency}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                      {item.toAmount.toLocaleString()}{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        {item.toCurrency}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {item.rateUsed}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {item.provider}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {new Date(item.exchangeDate).toLocaleDateString()}
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                      <Building2 size={12} />
                      {item.provider}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(item.exchangeDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 my-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {t("from")}
                      </p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {item.fromAmount.toLocaleString()} {item.fromCurrency}
                      </p>
                    </div>
                    <ArrowRightLeft
                      size={16}
                      className="text-teal-500 shrink-0"
                    />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {t("converted")}
                      </p>
                      <p className="text-lg font-black text-teal-600 dark:text-teal-400 tabular-nums">
                        {item.toAmount.toLocaleString()} {item.toCurrency}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      {t("rate")}:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {item.rateUsed}
                    </span>
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
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                      <span>
                        {item.fromAmount.toLocaleString()} {item.fromCurrency}
                      </span>
                      <span className="text-slate-400 text-sm font-normal">
                        →
                      </span>
                      <span className="text-teal-600 dark:text-teal-400">
                        {item.toAmount.toLocaleString()} {item.toCurrency}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-2">
                        @ {item.rateUsed}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {item.provider} •{" "}
                      {new Date(item.exchangeDate).toLocaleDateString()}
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
        size="md"
        closeOnBackdrop={!saving}
      >
        <Modal.Header>{editing ? t("edit") : t("logExchange")}</Modal.Header>
        <Modal.Body>
          <form
            id="exchange-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("from")}
                </label>
                <select
                  value={form.fromCurrency}
                  onChange={(e) =>
                    setForm({ ...form, fromCurrency: e.target.value })
                  }
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.fromAmount}
                  onChange={(e) => {
                    const fromAmount = e.target.value;
                    setForm({
                      ...form,
                      fromAmount,
                      rateUsed:
                        updateRate(fromAmount, form.toAmount) || form.rateUsed,
                    });
                  }}
                  className={inputCls}
                  placeholder={t("amount")}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("to")}
                </label>
                <select
                  value={form.toCurrency}
                  onChange={(e) =>
                    setForm({ ...form, toCurrency: e.target.value })
                  }
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.toAmount}
                  onChange={(e) => {
                    const toAmount = e.target.value;
                    setForm({
                      ...form,
                      toAmount,
                      rateUsed:
                        updateRate(form.fromAmount, toAmount) || form.rateUsed,
                    });
                  }}
                  className={inputCls}
                  placeholder={t("amount")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("rate")}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.rateUsed}
                  onChange={(e) =>
                    setForm({ ...form, rateUsed: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("provider")}
                </label>
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  className={inputCls}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("date")}
              </label>
              <input
                type="date"
                value={form.exchangeDate}
                onChange={(e) =>
                  setForm({ ...form, exchangeDate: e.target.value })
                }
                className={inputCls}
              />
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
            form="exchange-form"
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

export default ExchangeLog;
