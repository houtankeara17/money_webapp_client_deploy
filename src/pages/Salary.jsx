import { useEffect, useState, useRef, useMemo } from "react";
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
  Banknote,
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
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import useI18n from "../hooks/useI18n";
import { useAuth } from "../store/AuthContext";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import * as XLSX from "xlsx";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function resolveUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

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
const PAYMENTS = [
  "Cash",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Transfer",
  "Other",
];

const PAYMENT_META = {
  Cash: {
    emoji: "💵",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  "ABA Bank": {
    emoji: "🏦",
    tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  "ACLEDA Bank": {
    emoji: "🏛️",
    tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  Wing: {
    emoji: "📱",
    tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  Transfer: {
    emoji: "↔️",
    tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  Other: {
    emoji: "💰",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

const emptyForm = (currency, year) => ({
  amount: "",
  currency,
  year,
  monthNumber: new Date().getMonth() + 1,
  status: "Confirmed",
  paymentMethod: "ABA Bank",
  noted: "",
  images: [],
});

const Salary = () => {
  useDocumentTitle("Salary");
  const { t, tMonth } = useI18n();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const fileInputRef = useRef(null);

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
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState(
    () => localStorage.getItem("view_salary") || "list",
  );
  const [form, setForm] = useState(emptyForm(displayCurrency, currentYear));

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_salary", v);
  };

  const monthName = (n) =>
    tMonth ? tMonth(n) : MONTHS.find((m) => m.n === Number(n))?.name || n;

  const activeFilterCount = [
    filterStatus,
    filterMonth,
    filterPayment,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterMonth("");
    setFilterPayment("");
    setFilterSearch("");
    setPage(1);
  };

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

      if (filterStatus) params.status = filterStatus;
      if (filterMonth && period !== "monthly")
        params.monthNumber = Number(filterMonth);
      if (filterPayment) params.paymentMethod = filterPayment;

      const { data } = await api.get("/salaries", { params });
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
  }, [period, year, month, filterStatus, filterMonth, filterPayment]);

  useEffect(() => {
    setForm((f) => ({ ...f, currency: displayCurrency }));
  }, [displayCurrency]);

  useEffect(() => {
    if (!imagePreview) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setImagePreview("");
        setZoom(1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
      } else if (e.key === "0") {
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePreview]);

  const canPrev =
    availableYears.length === 0 || availableYears.some((y) => y < year);
  const canNext = availableYears.some((y) => y > year) || year < currentYear;

  const filteredItems = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const note = (item.noted || "").toLowerCase();
      const pay = (item.paymentMethod || "").toLowerCase();
      const amount = String(item.amount ?? "");
      return note.includes(q) || pay.includes(q) || amount.includes(q);
    });
  }, [items, filterSearch]);

  // Aggregate Metrics for Hero Section
  const metrics = useMemo(() => {
    const totalSalaryCount = filteredItems.length;
    const totalUSD = filteredItems.reduce((acc, curr) => {
      return acc + (curr.amountUSD || 0);
    }, 0);

    const paymentCounts = filteredItems.reduce((acc, curr) => {
      const method = curr.paymentMethod || "Other";
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    const topPayment =
      Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    return { totalSalaryCount, totalUSD, topPayment };
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
  }, [
    period,
    year,
    month,
    filterStatus,
    filterMonth,
    filterPayment,
    filterSearch,
  ]);

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
    setPreview("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const imgs = item.images || [];
    setForm({
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      year: item.year || year,
      monthNumber: item.monthNumber || 1,
      status: item.status || "Confirmed",
      paymentMethod: item.paymentMethod || "ABA Bank",
      noted: item.noted || "",
      images: imgs,
    });
    setPreview(imgs[0] ? resolveUrl(imgs[0]) : "");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving || uploading) return;
    setShowForm(false);
    setEditing(null);
    setPreview("");
  };

  const uploadReceipt = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data?.url;
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File must be under 8MB");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadReceipt(file);
      if (!url) throw new Error("No URL returned");
      setForm((f) => ({ ...f, images: [url] }));
      setPreview(resolveUrl(url));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Upload failed");
      setPreview("");
      setForm((f) => ({ ...f, images: [] }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeReceipt = () => {
    setForm((f) => ({ ...f, images: [] }));
    setPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      toast.error("Wait for upload to finish");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        year: Number(form.year),
        monthNumber: Number(form.monthNumber),
        status: form.status,
        paymentMethod: form.paymentMethod,
        noted: form.noted || "",
        images: form.images?.filter(Boolean) || [],
      };
      if (editing) {
        const { data } = await api.put(`/salaries/${editing._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/salaries", payload);
        toast.success(data.message || t("success"));
      }
      setShowForm(false);
      setEditing(null);
      setPreview("");
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
        const { data } = await api.delete("/salaries");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/salaries/${confirmDel}`);
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

  const handleExport = () => {
    try {
      if (!items || items.length === 0) {
        toast.error(t("noDataToExport") || "No data to export");
        return;
      }

      const exportData = items.map((item) => ({
        Year: item.year,
        MonthNumber: item.monthNumber,
        Amount: item.amount,
        Currency: item.currency,
        Status: item.status,
        PaymentMethod: item.paymentMethod || "",
        Noted: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Salaries");

      XLSX.writeFile(workbook, `salaries_${Date.now()}.xlsx`);
      toast.success(t("export"));
    } catch (err) {
      toast.error(t("failed"));
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const parsedItems = XLSX.utils.sheet_to_json(worksheet);

        if (parsedItems.length === 0) {
          toast.error(t("noData"));
          return;
        }

        const res = await api.post("/salaries/import", { items: parsedItems });
        toast.success(res.data.message || t("success"));
        fetchData({ silent: true });
      } catch (err) {
        toast.error(err.response?.data?.message || t("failed"));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const payMeta = (method) =>
    PAYMENT_META[method] || {
      emoji: "💰",
      tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    };

  const openImagePreview = (src) => {
    if (!src) return;
    setZoom(1);
    setImagePreview(src);
  };

  const MediaThumbSafe = ({ item, size = "md", className = "" }) => {
    const src = item.images?.[0] ? resolveUrl(item.images[0]) : "";
    const meta = payMeta(item.paymentMethod);
    const sizeCls =
      size === "lg"
        ? "w-full h-28 rounded-xl"
        : size === "sm"
          ? "w-10 h-10 rounded-xl"
          : "w-12 h-12 rounded-xl";

    const placeholder = (
      <div
        className={`${sizeCls} flex items-center justify-center shrink-0 text-xl sm:text-2xl ${meta.tone} ${className} ${src ? "hidden" : ""}`}
        title={item.paymentMethod}
      >
        {meta.emoji}
      </div>
    );

    if (!src) return placeholder;

    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openImagePreview(src);
          }}
          className={`${sizeCls} p-0 border-0 bg-transparent cursor-zoom-in shrink-0 overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-600/40 hover:ring-teal-500/50 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${className}`}
          title="Click to preview"
        >
          <img
            src={src}
            alt="Salary slip"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
              const sib = e.currentTarget.parentElement?.nextElementSibling;
              if (sib) sib.classList.remove("hidden");
            }}
          />
        </button>
        {placeholder}
      </>
    );
  };

  // Modern UI Classes matching ExchangeLog design theme
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
              {t("salary")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {yearSummary.count} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("monitorTrackSalary")}
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
            {t("addSalary")}
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
              {metrics.totalSalaryCount}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("totalSalary")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(metrics.totalUSD, displayCurrency, rates)}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("primaryPayment")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {metrics.topPayment}
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
              className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
            <div className="relative md:col-span-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder={`${t("searchNote")}, ${t("payment")}…`}
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
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              >
                <option value="">
                  {t("paymentMethod")}: {t("all")}
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
          icon={Banknote}
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
                {t("addSalary")}
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
                  <th className="p-4 w-12"></th>
                  <th className="p-4">{t("amount")}</th>
                  <th className="p-4">{t("month")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">{t("paymentMethod")}</th>
                  <th className="p-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {pagedItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-teal-500/5 transition-colors group"
                  >
                    <td className="p-4">
                      <MediaThumbSafe item={item} size="sm" />
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatOriginal(item.amount, item.currency)}
                      </div>
                      <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {monthName(item.monthNumber)} {item.year}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {item.paymentMethod}
                      </span>
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
                      {item.paymentMethod}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {monthName(item.monthNumber)} {item.year}
                    </span>
                  </div>

                  <div className="mb-3">
                    {item.images?.[0] ? (
                      <MediaThumbSafe item={item} size="lg" />
                    ) : (
                      <div className="w-full h-24 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-3xl">
                        {payMeta(item.paymentMethod).emoji}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Salary Amount
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                      {formatOriginal(item.amount, item.currency)}
                    </p>
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                      {formatMoney(item.amountUSD, displayCurrency, rates)}
                    </p>
                  </div>

                  {item.noted && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                      "{item.noted}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {statusLabel(item.status)}
                  </span>
                  <div className="flex items-center gap-1">
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
                  <MediaThumbSafe item={item} size="md" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                      <span>{formatOriginal(item.amount, item.currency)}</span>
                      <span className="text-teal-600 dark:text-teal-400 text-sm font-semibold">
                        ({formatMoney(item.amountUSD, displayCurrency, rates)})
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-2">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {item.paymentMethod} • {monthName(item.monthNumber)}{" "}
                      {item.year}
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
        closeOnBackdrop={!saving && !uploading}
      >
        <Modal.Header>{editing ? t("edit") : t("addSalary")}</Modal.Header>
        <Modal.Body>
          <form id="salary-form" onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("month")}
                </label>
                <select
                  value={form.monthNumber}
                  onChange={(e) =>
                    setForm({ ...form, monthNumber: e.target.value })
                  }
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

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1.5">
                <ImageIcon size={13} /> {t("salarySlip")}
              </label>

              {preview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => openImagePreview(preview)}
                    className="w-full cursor-zoom-in block p-0 border-0 bg-transparent"
                    title="Click to preview"
                  >
                    <img
                      src={preview}
                      alt="Salary slip"
                      className="w-full max-h-48 object-contain bg-slate-100 dark:bg-slate-900"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition z-10"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm font-medium">
                      {t("uploading")}...
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition text-slate-500"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <span className="text-sm font-medium">
                    {uploading ? t("uploading") : t("clickToUploadImage")}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t("fileTypeLimit")}
                  </span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={onFileChange}
              />

              {preview && !uploading && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-xs text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                >
                  {t("changeImage")}
                </button>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={closeForm}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="salary-form"
            disabled={saving || uploading}
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

      {/* Image Lightbox */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-sm"
          onClick={() => {
            setImagePreview("");
            setZoom(1);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => {
              setImagePreview("");
              setZoom(1);
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>

          <div
            className="relative flex-1 w-full flex items-center justify-center overflow-auto min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagePreview}
              alt="Salary slip preview"
              className="max-w-none rounded-2xl shadow-2xl transition-transform duration-200 ease-out select-none"
              style={{
                transform: `scale(${zoom})`,
                maxHeight: zoom <= 1 ? "75vh" : "none",
                maxWidth: zoom <= 1 ? "100%" : "none",
                width: zoom <= 1 ? "auto" : undefined,
                cursor: zoom > 1 ? "grab" : "default",
              }}
              draggable={false}
            />
          </div>

          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
              }
              disabled={zoom <= 0.5}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom out (−)"
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-[3.5rem] px-2 py-2 rounded-xl text-white text-sm font-medium tabular-nums hover:bg-white/15 transition"
              title="Reset zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
              }
              disabled={zoom >= 4}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Zoom in (+)"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-6 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-2.5 rounded-xl text-white hover:bg-white/15 transition"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
