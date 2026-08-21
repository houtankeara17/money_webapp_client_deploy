import { useEffect, useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Download,
  Wallet,
  Pencil,
  Upload,
  X,
  Image as ImageIcon,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Tag,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import useI18n from "../hooks/useI18n";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ConfirmModal from "../components/common/ConfirmModal";
import ViewToggle from "../components/common/ViewToggle";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../constants/categories";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function resolveUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

const emptyForm = (currency = "USD") => ({
  amount: "",
  currency,
  category: "Food",
  paymentMethod: "Cash",
  expenseDate: new Date().toISOString().slice(0, 10),
  noted: "",
  images: [],
});

const PAGE_SIZES = [10, 20, 50];

const Expense2 = () => {
  useDocumentTitle("Expenses");
  const { t, tEnum } = useI18n();
  const { user } = useAuth();

  const fileRef = useRef(null);
  const importFileRef = useRef(null);

  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(
    () => localStorage.getItem("view_expenses") || "list",
  );
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [zoom, setZoom] = useState(1);
  const [form, setForm] = useState(emptyForm(displayCurrency));

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const openImagePreview = (src) => {
    setZoom(1);
    setImagePreview(src);
  };

  const closeImagePreview = () => {
    setImagePreview("");
    setZoom(1);
  };

  const zoomIn = () =>
    setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
  const zoomOut = () =>
    setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const zoomReset = () => setZoom(1);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_expenses", v);
  };

  const activeFilterCount = [
    filterCategory,
    filterPayment,
    filterFrom,
    filterTo,
    filterSearch.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCategory("");
    setFilterPayment("");
    setFilterFrom("");
    setFilterTo("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { limit: 500 };
      if (filterCategory) params.category = filterCategory;
      if (filterPayment) params.paymentMethod = filterPayment;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const { data } = await api.get("/expenses", { params });
      setItems(data.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setForm((f) => ({ ...f, currency: displayCurrency }));
    setPage(1);
  }, [displayCurrency, filterCategory, filterPayment, filterFrom, filterTo]);

  useEffect(() => {
    if (!imagePreview) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeImagePreview();
      else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePreview]);

  const filteredItems = useMemo(() => {
    let list = items;
    const q = filterSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const note = (item.noted || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        const pay = (item.paymentMethod || "").toLowerCase();
        const amount = String(item.amount ?? "");
        return (
          note.includes(q) ||
          cat.includes(q) ||
          pay.includes(q) ||
          amount.includes(q)
        );
      });
    }
    if (filterFrom) {
      const from = new Date(filterFrom).getTime();
      list = list.filter(
        (item) => new Date(item.expenseDate).getTime() >= from,
      );
    }
    if (filterTo) {
      const to = new Date(filterTo).setHours(23, 59, 59, 999);
      list = list.filter((item) => new Date(item.expenseDate).getTime() <= to);
    }
    if (filterCategory) {
      list = list.filter((item) => item.category === filterCategory);
    }
    if (filterPayment) {
      list = list.filter((item) => item.paymentMethod === filterPayment);
    }
    return list;
  }, [
    items,
    filterSearch,
    filterFrom,
    filterTo,
    filterCategory,
    filterPayment,
  ]);

  // Metric computations matching ExchangeLog styling structure
  const metrics = useMemo(() => {
    const totalEntries = filteredItems.length;
    const totalUSD = filteredItems.reduce(
      (acc, curr) => acc + Number(curr.amountUSD || 0),
      0,
    );

    const categoryCounts = filteredItems.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

    const topCategoryKey =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A";

    return { totalEntries, totalUSD, topCategoryKey };
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(displayCurrency));
    setPreview("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const imgs = item.images || [];
    setForm({
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      category: item.category || "Food",
      paymentMethod: item.paymentMethod || "Cash",
      expenseDate: item.expenseDate
        ? new Date(item.expenseDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
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
      toast.success("Receipt uploaded");
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
    if (!form.amount || Number(form.amount) < 0) {
      toast.error(t("enter_valid_amount"));
      return;
    }
    if (uploading) {
      toast.error(t("wait_for_upload"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        category: form.category,
        paymentMethod: form.paymentMethod,
        expenseDate: form.expenseDate,
        noted: form.noted || "",
        images: form.images?.filter(Boolean) || [],
      };
      if (editing) {
        const { data } = await api.put(`/expenses/${editing._id}`, payload);
        toast.success(data.message ? t(data.message) : t("expense_updated"));
      } else {
        const { data } = await api.post("/expenses", payload);
        toast.success(data.message ? t(data.message) : t("expense_added"));
      }
      setShowForm(false);
      setEditing(null);
      setPreview("");
      fetchData({ silent: true });
    } catch (err) {
      const backendErrorKey = err.response?.data?.message;
      toast.error(backendErrorKey ? t(backendErrorKey) : t("failed"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/expenses");
        const messageKey = data?.message;
        toast.success(messageKey ? t(messageKey) : t("allExpensesDeleted"));
      } else {
        const { data } = await api.delete(`/expenses/${confirmDel}`);
        const messageKey = data?.message;
        toast.success(
          messageKey ? t(messageKey) : t("expensesdeletedsuccessfully"),
        );
      }
      setConfirmDel(null);
      fetchData({ silent: true });
    } catch (err) {
      const backendErrorKey = err.response?.data?.message;
      toast.error(backendErrorKey ? t(backendErrorKey) : t("failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get("/expenses/export");
      const rawItems = data.data || [];

      if (rawItems.length === 0) {
        toast.error(t("noData"));
        return;
      }

      const formattedData = rawItems.map((item) => ({
        ExpenseDate: item.expenseDate
          ? new Date(item.expenseDate).toISOString().slice(0, 10)
          : "",
        Amount: item.amount || 0,
        Currency: item.currency || "USD",
        Category: item.category || "",
        PaymentMethod: item.paymentMethod || "",
        Noted: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      XLSX.writeFile(workbook, `expenses-${Date.now()}.xlsx`);
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

      const { data } = await api.post("/expenses/import", {
        items: parsedData,
      });
      toast.success(data.message || t("success"));
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      e.target.value = "";
    }
  };

  const catLabel = (id) => {
    const c = EXPENSE_CATEGORIES.find((x) => x.id === id);
    return c ? `${c.emoji} ${tEnum(c.id)}` : tEnum(id);
  };
  const payLabel = (id) => {
    const p = PAYMENT_METHODS.find((x) => x.id === id);
    return p ? `${p.emoji} ${p.label}` : id;
  };
  const catEmoji = (id) => {
    const c = EXPENSE_CATEGORIES.find((x) => x.id === id);
    return c?.emoji || "🧾";
  };
  const catTone = (id) => {
    const map = {
      Food: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      Transport: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      Shopping: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
      Bills: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      Health: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      Education: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
      Entertainment: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
      Loan: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      Travel: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
      Other: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    };
    return map[id] || "bg-teal-500/15 text-teal-600 dark:text-teal-400";
  };

  const MediaThumbSafe = ({ item, size = "md", className = "" }) => {
    const src = item.images?.[0] ? resolveUrl(item.images[0]) : "";
    const sizeCls =
      size === "lg"
        ? "w-full h-28 rounded-xl"
        : size === "sm"
          ? "w-10 h-10 rounded-xl"
          : "w-12 h-12 rounded-xl";

    const placeholder = (
      <div
        className={`${sizeCls} flex items-center justify-center shrink-0 text-xl sm:text-2xl ${catTone(item.category)} ${className} ${src ? "hidden" : ""}`}
        title={catLabel(item.category)}
      >
        {catEmoji(item.category)}
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
            alt="Receipt"
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

  // Exact matching classes from ExchangeLog
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
        ref={importFileRef}
        onChange={handleImport}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Header Banner (Matching ExchangeLog) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("expenses")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {items.length} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("monitorExpense")}
          </p>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setViewMode} />

          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
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
            onClick={() => setConfirmDel("all")}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline">{t("deleteAll")}</span>
          </button>

          <button type="button" onClick={openCreate} className={btnPrimary}>
            <Plus size={16} />
            {t("addExpense")}
          </button>
        </div>
      </div>

      {/* Metrics Banner (Matching ExchangeLog) */}
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
              {metrics.totalEntries}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("totalOutflow")} (USD)
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              ${metrics.totalUSD.toLocaleString()}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Tag size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("topExpenseCategory")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {metrics.topCategoryKey !== "N/A"
                ? catLabel(metrics.topCategoryKey)
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Toggle */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex items-center justify-between gap-3`}
      >
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 px-2">
          {t("overview")} ({displayCurrency})
        </span>

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

      {/* Advanced Filters Drawer (Matching ExchangeLog) */}
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

          <div className="space-y-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => {
                  setFilterSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={`${t("searchNote")} ${t("category")} ${t("amount")}…`}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                >
                  <option value="">
                    {t("category")}: {t("all")}
                  </option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {tEnum(c.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterPayment}
                  onChange={(e) => {
                    setFilterPayment(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                >
                  <option value="">
                    {t("paymentMethod")}: {t("all")}
                  </option>
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => {
                    setFilterFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => {
                    setFilterTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>
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
          icon={Wallet}
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
                {t("addExpense")}
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
                  <th className="p-4">{t("category")}</th>
                  <th className="p-4">{t("paymentMethod")}</th>
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
                    <td className="p-4">
                      <MediaThumbSafe item={item} size="sm" />
                    </td>
                    <td className="p-4 font-extrabold text-slate-900 dark:text-white tabular-nums">
                      <div>{formatOriginal(item.amount, item.currency)}</div>
                      <div className="text-xs font-semibold text-slate-500 tabular-nums">
                        {formatMoney(item.amountUSD, displayCurrency, rates)}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {catLabel(item.category)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {payLabel(item.paymentMethod)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 text-xs font-medium tabular-nums">
                      {new Date(item.expenseDate).toLocaleDateString()}
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
                          onClick={() => setConfirmDel(item._id)}
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
                  <div className="mb-3">
                    {item.images?.[0] ? (
                      <MediaThumbSafe item={item} size="lg" className="mb-0" />
                    ) : (
                      <div
                        className={`w-full h-28 rounded-2xl flex flex-col items-center justify-center gap-1.5 ${catTone(item.category)}`}
                      >
                        <span className="text-4xl leading-none">
                          {catEmoji(item.category)}
                        </span>
                        <span className="text-xs font-bold opacity-80">
                          {tEnum(item.category) || item.category}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                      {payLabel(item.paymentMethod)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(item.expenseDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="my-2">
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                      {formatOriginal(item.amount, item.currency)}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 tabular-nums">
                      ≈ {formatMoney(item.amountUSD, displayCurrency, rates)}
                    </p>
                  </div>

                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                    {catLabel(item.category)}
                  </p>

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
                    onClick={() => setConfirmDel(item._id)}
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
                  <MediaThumbSafe item={item} size="md" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                      <span>{formatOriginal(item.amount, item.currency)}</span>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">
                        ({formatMoney(item.amountUSD, displayCurrency, rates)})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {catLabel(item.category)} • {payLabel(item.paymentMethod)}{" "}
                      • {new Date(item.expenseDate).toLocaleDateString()}
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
                    onClick={() => setConfirmDel(item._id)}
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
        size="lg"
        closeOnBackdrop={!saving && !uploading}
      >
        <Modal.Header>{editing ? t("edit") : t("addExpense")}</Modal.Header>
        <Modal.Body>
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t("amount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputCls}
                  placeholder="0.00"
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
                  <option value="USD">USD $</option>
                  <option value="KHR">KHR ៛</option>
                  <option value="THB">THB ฿</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("category")}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-[0.98] ${
                      form.category === c.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-teal-500"
                    }`}
                  >
                    {c.emoji} {tEnum(c.id)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("paymentMethod")}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: p.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-[0.98] ${
                      form.paymentMethod === p.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-teal-500"
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("date")}
              </label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) =>
                  setForm({ ...form, expenseDate: e.target.value })
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

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1.5">
                <ImageIcon size={13} /> Receipt image
              </label>
              {preview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => openImagePreview(preview)}
                    className="w-full cursor-zoom-in block p-0 border-0 bg-transparent"
                    title="Click to preview"
                  >
                    <img
                      src={preview}
                      alt="Receipt"
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
                      Uploading...
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition text-slate-500"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <span className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Click to upload receipt"}
                  </span>
                  <span className="text-xs text-slate-400">
                    JPG, PNG, WebP or PDF · max 8MB
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
                  className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                >
                  Replace image
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
            form="expense-form"
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

      {/* Image Lightbox Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
                title="Zoom out (−)"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="min-w-[4.5rem] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold tabular-nums transition"
                title="Reset zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 4}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
                title="Zoom in (+)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={zoomReset}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition ml-1"
                title="Reset"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={closeImagePreview}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              title="Close (Esc)"
            >
              <X size={18} />
              <span className="hidden sm:inline">Esc</span>
            </button>
          </div>
          <div
            className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 sm:p-6 cursor-zoom-out"
            onClick={closeImagePreview}
          >
            <img
              src={imagePreview}
              alt="Receipt preview"
              className="max-w-none object-contain rounded-xl shadow-2xl select-none transition-transform duration-200 ease-out origin-center"
              style={{
                transform: `scale(${zoom})`,
                maxHeight: zoom === 1 ? "80vh" : "none",
                maxWidth: zoom === 1 ? "min(100%, 90vw)" : "none",
                width: zoom === 1 ? "auto" : undefined,
              }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>
          <p className="text-center text-xs text-white/50 pb-3 shrink-0">
            Scroll to pan when zoomed · + / − zoom · 0 reset · Esc close
          </p>
        </div>
      )}
    </div>
  );
};

export default Expense2;
