import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Plus,
  Trash2,
  Pencil,
  Banknote,
  Info,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter,
  Search,
  RotateCcw,
  TrendingUp,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../store/AuthContext";
import useI18n from "../hooks/useI18n";
import { formatMoney, formatOriginal } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import ViewToggle from "../components/common/ViewToggle";
import ConfirmModal from "../components/common/ConfirmModal";

const RELATIONS = ["Friend", "Relative", "Colleague", "Neighbor", "Other"];
const PAYMENTS = [
  "Cash",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing",
  "Transfer",
  "Other",
];
const CURRENCIES = ["USD", "KHR", "THB"];
const PAGE_SIZES = [10, 20, 50];

const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

const getInitialForm = (currency) => ({
  direction: "lent",
  person: "",
  relation: "Friend",
  amount: "",
  currency,
  loanDate: getTodayDateStr(),
  dueDate: "",
  paymentMethod: "Cash",
  noted: "",
  trackCashFlow: true,
  interestRate: "0",
  interestType: "simple",
});

const Loans = () => {
  useDocumentTitle("Loans");
  const { t, tEnum } = useI18n();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const rates = useMemo(
    () => ({
      exchangeRateKhr: user?.exchangeRateKhr,
      exchangeRateThb: user?.exchangeRateThb,
    }),
    [user?.exchangeRateKhr, user?.exchangeRateThb],
  );

  const displayCurrency = user?.currency || "USD";

  // Data States
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ lent: {}, borrowed: {} });
  const [dirFilter, setDirFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // UI / Modal States
  const [showGuide, setShowGuide] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showRepay, setShowRepay] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [repayLoan, setRepayLoan] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState(
    () => localStorage.getItem("view_loans") || "grid",
  );

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Form States
  const [form, setForm] = useState(() => getInitialForm(displayCurrency));
  const [repayForm, setRepayForm] = useState({
    amount: "",
    currency: displayCurrency,
    date: getTodayDateStr(),
    noted: "",
  });

  const abortControllerRef = useRef(null);

  const setViewMode = (v) => {
    setView(v);
    localStorage.setItem("view_loans", v);
  };

  const updateFormField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateRepayField = useCallback((key, value) => {
    setRepayForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const activeFilterCount = [currencyFilter, filterSearch.trim()].filter(
    Boolean,
  ).length;

  const clearFilters = () => {
    setCurrencyFilter("");
    setFilterSearch("");
    setPage(1);
  };

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (!silent) setLoading(true);
      try {
        const params = { limit: 100 };
        if (dirFilter) params.direction = dirFilter;

        const { data } = await api.get("/loans", {
          params,
          signal: abortControllerRef.current.signal,
        });

        setItems(data.data?.items || []);
        setSummary(data.data?.summary || { lent: {}, borrowed: {} });
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        toast.error(err.response?.data?.message || "Failed to load loans");
      } finally {
        setLoading(false);
      }
    },
    [dirFilter],
  );

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (currencyFilter) {
      result = result.filter((item) => item.currency === currencyFilter);
    }

    const q = filterSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const person = (item.person || "").toLowerCase();
        const relation = (item.relation || "").toLowerCase();
        const note = (item.noted || "").toLowerCase();
        const payment = (item.paymentMethod || "").toLowerCase();
        const amount = String(item.amount ?? "");
        return (
          person.includes(q) ||
          relation.includes(q) ||
          note.includes(q) ||
          payment.includes(q) ||
          amount.includes(q)
        );
      });
    }

    return result;
  }, [items, currencyFilter, filterSearch]);

  const calculateOutstanding = useCallback((item) => {
    if (item.outstandingUSD != null) return Number(item.outstandingUSD);
    return Math.max(
      0,
      (Number(item.amountUSD) || 0) - (Number(item.repaidAmountUSD) || 0),
    );
  }, []);

  // Aggregated metrics matching ExchangeLog header banner
  const metrics = useMemo(() => {
    const totalCount = filteredItems.length;
    const totalLentUSD = filteredItems
      .filter((i) => i.direction === "lent")
      .reduce((acc, curr) => acc + calculateOutstanding(curr), 0);
    const totalBorrowedUSD = filteredItems
      .filter((i) => i.direction === "borrowed")
      .reduce((acc, curr) => acc + calculateOutstanding(curr), 0);

    const personCounts = filteredItems.reduce((acc, curr) => {
      acc[curr.person] = (acc[curr.person] || 0) + 1;
      return acc;
    }, {});

    const topPerson =
      Object.entries(personCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return { totalCount, totalLentUSD, totalBorrowedUSD, topPerson };
  }, [filteredItems, calculateOutstanding]);

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
  }, [dirFilter, currencyFilter, filterSearch]);

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
    setEditingItem(null);
    setForm(getInitialForm(displayCurrency));
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      direction: item.direction,
      person: item.person || "",
      relation: item.relation || "Friend",
      amount: String(item.amount ?? ""),
      currency: item.currency || displayCurrency,
      loanDate: item.loanDate
        ? new Date(item.loanDate).toISOString().slice(0, 10)
        : "",
      dueDate: item.dueDate
        ? new Date(item.dueDate).toISOString().slice(0, 10)
        : "",
      paymentMethod: item.paymentMethod || "Cash",
      noted: item.noted || "",
      trackCashFlow: item.trackCashFlow !== false,
      interestRate: String(item.interestRate ?? 0),
      interestType: item.interestType || "simple",
    });
    setShowForm(true);
  };

  const openRepay = (item) => {
    setRepayLoan(item);
    setRepayForm({
      amount: "",
      currency: item.currency || displayCurrency,
      date: getTodayDateStr(),
      noted: "",
    });
    setShowRepay(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedPerson = form.person?.trim();
    const parsedAmount = Number(form.amount);

    if (!trimmedPerson) {
      toast.error("Please enter a person's name");
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid loan amount greater than 0");
      return;
    }

    const payload = {
      direction: form.direction || "lent",
      person: trimmedPerson,
      relation: form.relation || "Friend",
      amount: parsedAmount,
      currency: form.currency || displayCurrency,
      loanDate: form.loanDate
        ? new Date(form.loanDate).toISOString()
        : new Date().toISOString(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      paymentMethod: form.paymentMethod || "Cash",
      noted: form.noted || "",
      trackCashFlow: Boolean(form.trackCashFlow),
      interestRate: isNaN(Number(form.interestRate))
        ? 0
        : Number(form.interestRate),
      interestType: form.interestType === "compound" ? "compound" : "simple",
    };

    try {
      if (editingItem) {
        const { data } = await api.put(`/loans/${editingItem._id}`, payload);
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.post("/loans", payload);
        toast.success(data.message || t("success"));
      }

      setShowForm(false);
      setEditingItem(null);
      fetchData({ silent: true });
    } catch (err) {
      const backendMsg =
        err.response?.data?.message || err.response?.data?.error;
      toast.error(backendMsg || t("failed"));
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!repayLoan) return;

    try {
      const { data } = await api.post(`/loans/${repayLoan._id}/repay`, {
        amount: Number(repayForm.amount),
        currency: repayForm.currency,
        date: repayForm.date,
        noted: repayForm.noted,
      });
      toast.success(data.message || t("success"));
      setShowRepay(false);
      setRepayLoan(null);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDel === "all") {
        const { data } = await api.delete("/loans");
        toast.success(data.message || t("success"));
      } else {
        const { data } = await api.delete(`/loans/${confirmDel}`);
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
        Direction: item.direction,
        Person: item.person,
        Relation: item.relation,
        Amount: item.amount,
        Currency: item.currency,
        PaymentMethod: item.paymentMethod,
        LoanDate: item.loanDate
          ? new Date(item.loanDate).toISOString().slice(0, 10)
          : "",
        DueDate: item.dueDate
          ? new Date(item.dueDate).toISOString().slice(0, 10)
          : "",
        InterestRate: item.interestRate || 0,
        InterestType: item.interestType || "simple",
        Noted: item.noted || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Loans");

      XLSX.writeFile(workbook, `loans_${Date.now()}.xlsx`);
      toast.success(t("exportSuccess") || "Exported successfully");
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
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedItems = XLSX.utils.sheet_to_json(sheet);

        if (!parsedItems || parsedItems.length === 0) {
          toast.error("File is empty or contains no data");
          return;
        }

        const { data: resData } = await api.post("/loans/import", {
          items: parsedItems,
        });
        toast.success(resData.message || t("success"));
        fetchData({ silent: true });
      } catch (err) {
        toast.error(err.response?.data?.message || t("failed"));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Modern UI Classes matching ExchangeLog design theme
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
        accept=".xlsx, .xls, .csv, .json"
        className="hidden"
      />

      {/* Header Banner matching ExchangeLog */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("loans")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {items.length} {t("entries")}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("loanGuideTitle")}
          </p>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setViewMode} />

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md text-sm font-semibold transition active:scale-[0.98]"
          >
            <Info size={15} />
            <span className="hidden sm:inline">
              {showGuide ? t("hide") : t("show")}
            </span>
          </button>

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
            {t("addLoan")}
          </button>
        </div>
      </div>

      {/* Guide Card matching ExchangeLog design */}
      {showGuide && (
        <div className={`${cardCls} rounded-2xl p-5 space-y-3`}>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <Info size={16} className="text-teal-600" />
            {t("loanGuideTitle")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
            <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 p-3 border border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
              <strong className="block mb-1 text-sm font-bold">
                🤝 {t("loanLent")}
              </strong>
              <div>→ {t("expenses")} (Loan) when created</div>
              <div>← {t("savings")} (Loan return) when repaid</div>
            </div>
            <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 p-3 border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300">
              <strong className="block mb-1 text-sm font-bold">
                📥 {t("loanBorrowed")}
              </strong>
              <div>← {t("savings")} (Loan return) when created</div>
              <div>→ {t("expenses")} (Loan) when you repay</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Banner matching ExchangeLog */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("loanLent")} ({t("loanOutstanding")})
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(
                summary.lent?.outstandingUSD || metrics.totalLentUSD,
                displayCurrency,
                rates,
              )}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("loanBorrowed")} ({t("loanOutstanding")})
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatMoney(
                summary.borrowed?.outstandingUSD || metrics.totalBorrowedUSD,
                displayCurrency,
                rates,
              )}
            </p>
          </div>
        </div>

        <div className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("topContact")}
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">
              {metrics.topPerson}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Pills & Advanced Filters */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80">
            {[
              { key: "", label: t("all") },
              { key: "lent", label: t("loanLent") },
              { key: "borrowed", label: t("loanBorrowed") },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDirFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  dirFilter === f.key
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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

      {/* Advanced Filters Drawer matching ExchangeLog */}
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
                placeholder={`${t("loanPerson")}, ${t("relation")}, ${t("note")}…`}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
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

      {/* Main Content Display matching ExchangeLog views */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={t("noData")}
          hint={t("noDataHint") || t("loanGuideLent")}
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
                {t("addLoan")}
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
                  <th className="p-4">{t("loanPerson")}</th>
                  <th className="p-4">{t("amount")}</th>
                  <th className="p-4">{t("loanOutstanding")}</th>
                  <th className="p-4">{t("paymentMethod")}</th>
                  <th className="p-4">{t("date")}</th>
                  <th className="p-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {pagedItems.map((item) => {
                  const left = calculateOutstanding(item);
                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-teal-500/5 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {item.person}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.direction === "lent"
                            ? t("loanLent")
                            : t("loanBorrowed")}{" "}
                          • {tEnum(item.relation) || item.relation}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatOriginal(item.amount, item.currency)}
                      </td>
                      <td className="p-4 font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                        {formatMoney(left, displayCurrency, rates)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold">
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {item.loanDate
                          ? new Date(item.loanDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {item.status !== "Paid" &&
                            item.status !== "Cancelled" && (
                              <button
                                type="button"
                                onClick={() => openRepay(item)}
                                className="px-2.5 py-1 rounded-lg text-xs bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-100 transition"
                              >
                                {t("recordRepayment")}
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
              const left = calculateOutstanding(item);
              const dueBase =
                Number(item.totalDueUSD) || Number(item.amountUSD) || 0;
              const pct =
                dueBase > 0
                  ? Math.min(
                      100,
                      Math.round(((item.repaidAmountUSD || 0) / dueBase) * 100),
                    )
                  : 0;

              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-3xl p-5 relative group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                        {item.direction === "lent"
                          ? t("loanLent")
                          : t("loanBorrowed")}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {item.loanDate
                          ? new Date(item.loanDate).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                        {item.person}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400">
                        {tEnum(item.relation) || item.relation} •{" "}
                        {item.paymentMethod}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 my-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {t("amount")}
                        </p>
                        <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                          {formatOriginal(item.amount, item.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {t("loanOutstanding")}
                        </p>
                        <p className="text-lg font-black text-teal-600 dark:text-teal-400 tabular-nums">
                          {formatMoney(left, displayCurrency, rates)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 my-3">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>{pct}% Repaid</span>
                        <span>
                          {formatMoney(
                            item.repaidAmountUSD || 0,
                            displayCurrency,
                            rates,
                          )}
                        </span>
                      </div>
                    </div>

                    {item.noted && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        "{item.noted}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between">
                    <div>
                      {item.status !== "Paid" &&
                        item.status !== "Cancelled" && (
                          <button
                            type="button"
                            onClick={() => openRepay(item)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-100 transition"
                          >
                            {t("recordRepayment")}
                          </button>
                        )}
                    </div>
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
                        onClick={() => setConfirmDel(item._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
              const left = calculateOutstanding(item);
              return (
                <div
                  key={item._id}
                  className={`${cardCls} rounded-2xl p-4 flex items-center justify-between gap-4 group`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 font-bold">
                      <Banknote size={20} />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap font-black text-slate-900 dark:text-white text-base">
                        <span>{item.person}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {formatOriginal(item.amount, item.currency)}
                        </span>
                        <span className="text-teal-600 dark:text-teal-400 text-xs font-bold">
                          {t("left")}:{" "}
                          {formatMoney(left, displayCurrency, rates)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.direction === "lent"
                          ? t("loanLent")
                          : t("loanBorrowed")}{" "}
                        • {tEnum(item.relation) || item.relation} •{" "}
                        {item.loanDate
                          ? new Date(item.loanDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                    {item.status !== "Paid" && item.status !== "Cancelled" && (
                      <button
                        type="button"
                        onClick={() => openRepay(item)}
                        className="px-2.5 py-1.5 rounded-xl text-xs bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-100 transition"
                      >
                        {t("recordRepayment")}
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

      {/* Entry Modal Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} size="md">
        <Modal.Header>{editingItem ? t("edit") : t("addLoan")}</Modal.Header>
        <Modal.Body>
          <form id="loan-form" onSubmit={handleSubmit} className="space-y-4">
            {!editingItem && (
              <div className="grid grid-cols-2 gap-2">
                {["lent", "borrowed"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateFormField("direction", d)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold border transition ${
                      form.direction === d
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {d === "lent" ? t("loanLent") : t("loanBorrowed")}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label
                htmlFor="person"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {t("loanPerson")}
              </label>
              <input
                id="person"
                required
                value={form.person}
                onChange={(e) => updateFormField("person", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="relation"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("relation")}
                </label>
                <select
                  id="relation"
                  value={form.relation}
                  onChange={(e) => updateFormField("relation", e.target.value)}
                  className={inputCls}
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {tEnum(r) || r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="paymentMethod"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("paymentMethod")}
                </label>
                <select
                  id="paymentMethod"
                  value={form.paymentMethod}
                  onChange={(e) =>
                    updateFormField("paymentMethod", e.target.value)
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="amount"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("amount")}
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  disabled={
                    !!editingItem && (editingItem.repayments?.length || 0) > 0
                  }
                  value={form.amount}
                  onChange={(e) => updateFormField("amount", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="currency"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("currency")}
                </label>
                <select
                  id="currency"
                  value={form.currency}
                  disabled={
                    !!editingItem && (editingItem.repayments?.length || 0) > 0
                  }
                  onChange={(e) => updateFormField("currency", e.target.value)}
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
                <label
                  htmlFor="loanDate"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("date")}
                </label>
                <input
                  id="loanDate"
                  type="date"
                  value={form.loanDate}
                  onChange={(e) => updateFormField("loanDate", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="dueDate"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("loanDue")}
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateFormField("dueDate", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="interestRate"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("interestRate")} (% / year)
                </label>
                <input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.interestRate}
                  onChange={(e) =>
                    updateFormField("interestRate", e.target.value)
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="interestType"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("interestType")}
                </label>
                <select
                  id="interestType"
                  value={form.interestType}
                  onChange={(e) =>
                    updateFormField("interestType", e.target.value)
                  }
                  className={inputCls}
                >
                  <option value="simple">{t("interestSimple")}</option>
                  <option value="compound">{t("interestCompound")}</option>
                </select>
              </div>
            </div>

            {!editingItem && (
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.trackCashFlow}
                  onChange={(e) =>
                    updateFormField("trackCashFlow", e.target.checked)
                  }
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                {t("trackCashFlow")}
              </label>
            )}

            <div>
              <label
                htmlFor="noted"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {t("note")}
              </label>
              <textarea
                id="noted"
                value={form.noted}
                onChange={(e) => updateFormField("noted", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button type="submit" form="loan-form" className={btnPrimary}>
            {t("save")}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Repay Modal */}
      <Modal open={showRepay} onClose={() => setShowRepay(false)} size="sm">
        <Modal.Header>
          {t("recordRepayment")} — {repayLoan?.person}
        </Modal.Header>
        <Modal.Body>
          <form id="repay-form" onSubmit={handleRepay} className="space-y-4">
            <p className="text-xs font-semibold text-slate-500">
              {t("loanOutstanding")}:{" "}
              <span className="font-bold text-teal-600 dark:text-teal-400">
                {repayLoan
                  ? formatMoney(
                      calculateOutstanding(repayLoan),
                      displayCurrency,
                      rates,
                    )
                  : "—"}
              </span>
            </p>
            <div>
              <label
                htmlFor="repayAmount"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {t("amount")}
              </label>
              <input
                id="repayAmount"
                type="number"
                step="0.01"
                required
                value={repayForm.amount}
                onChange={(e) => updateRepayField("amount", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="repayCurrency"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("currency")}
                </label>
                <select
                  id="repayCurrency"
                  value={repayForm.currency}
                  onChange={(e) => updateRepayField("currency", e.target.value)}
                  className={inputCls}
                >
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                  <option value="THB">THB</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="repayDate"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t("date")}
                </label>
                <input
                  id="repayDate"
                  type="date"
                  value={repayForm.date}
                  onChange={(e) => updateRepayField("date", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="repayNoted"
                className="text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {t("note")}
              </label>
              <input
                id="repayNoted"
                value={repayForm.noted}
                onChange={(e) => updateRepayField("noted", e.target.value)}
                className={inputCls}
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setShowRepay(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t("cancel")}
          </button>
          <button type="submit" form="repay-form" className={btnPrimary}>
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

export default Loans;
