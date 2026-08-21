import { useEffect, useState, useRef, useCallback } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { useAuth } from "../store/AuthContext";
import { formatMoney } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";
import toast from "react-hot-toast";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Wallet,
  PiggyBank,
  Send,
  Banknote,
  Gift,
  PieChart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { t, tMonth } = useI18n();
  const { user, loading: authLoading } = useAuth(); // Gate requests if auth is loading

  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState("month"); // "month" | "year" | "all"

  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const abortControllerRef = useRef(null);

  // Fetch Data
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError("");

      try {
        const reqConfig = { signal: controller.signal, timeout: 30000 };

        let summaryParams = {};
        let chartParams = {};
        let budgetParams = {};

        if (viewMode === "month") {
          summaryParams = { year, monthNumber: month };
          chartParams = { year };
          budgetParams = { year, monthNumber: month, limit: 1 };
        } else if (viewMode === "year") {
          summaryParams = { year };
          chartParams = { year };
          budgetParams = { year, limit: 12 };
        } else if (viewMode === "all") {
          summaryParams = { allTime: true };
          chartParams = { allTime: true };
          budgetParams = { limit: 100 };
        }

        const [sumRes, chartRes, budgetRes] = await Promise.allSettled([
          api.get("/reports/summary", { ...reqConfig, params: summaryParams }),
          api.get("/reports/charts", { ...reqConfig, params: chartParams }),
          api.get("/budgets", { ...reqConfig, params: budgetParams }),
        ]);

        if (controller.signal.aborted) return;

        let hasError = false;
        let isUnauthorized = false;

        // Check if any request failed due to 401 Unauthorized
        const checkUnauthorized = (res) =>
          res.status === "rejected" && res.reason?.response?.status === 401;

        if (
          checkUnauthorized(sumRes) ||
          checkUnauthorized(chartRes) ||
          checkUnauthorized(budgetRes)
        ) {
          isUnauthorized = true;
        }

        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value.data?.data || null);
        } else if (!axios.isCancel(sumRes.reason)) {
          hasError = true;
        }

        if (chartRes.status === "fulfilled") {
          setCharts(chartRes.value.data?.data || null);
        } else if (!axios.isCancel(chartRes.reason)) {
          hasError = true;
        }

        if (budgetRes.status === "fulfilled") {
          const budgetData = budgetRes.value.data?.data;
          if (
            (viewMode === "year" || viewMode === "all") &&
            Array.isArray(budgetData?.items)
          ) {
            const aggregatedBudget = budgetData.items.reduce(
              (acc, curr) => ({
                plannedIncomeUSD:
                  (acc.plannedIncomeUSD || 0) + (curr.plannedIncomeUSD || 0),
                savingsAmountUSD:
                  (acc.savingsAmountUSD || 0) + (curr.savingsAmountUSD || 0),
                remittanceAmountUSD:
                  (acc.remittanceAmountUSD || 0) +
                  (curr.remittanceAmountUSD || 0),
                spendingAmountUSD:
                  (acc.spendingAmountUSD || 0) + (curr.spendingAmountUSD || 0),
              }),
              {
                plannedIncomeUSD: 0,
                savingsAmountUSD: 0,
                remittanceAmountUSD: 0,
                spendingAmountUSD: 0,
              },
            );
            setBudget(budgetData.items.length > 0 ? aggregatedBudget : null);
          } else {
            setBudget(budgetData?.items?.[0] || null);
          }
        } else {
          setBudget(null);
        }

        if (isUnauthorized) {
          // Token expired or invalid, interceptor will handle redirect
          return;
        }

        if (
          hasError &&
          sumRes.status === "rejected" &&
          chartRes.status === "rejected"
        ) {
          const msg = t("failed") || "Failed to load dashboard data";
          setError(msg);
          toast.error(msg, { id: "dashboard-fetch-error" });
        } else if (isManualRefresh) {
          toast.success(t("dashboardUpdated"), { id: "dashboard-refresh" });
        }
      } catch (err) {
        if (!axios.isCancel(err) && !controller.signal.aborted) {
          const msg =
            err.response?.data?.message || t("failed") || "Failed to load data";
          setError(msg);
          toast.error(msg, { id: "dashboard-fetch-error" });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [year, month, viewMode, t],
  );

  useEffect(() => {
    if (authLoading || !user) return;

    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, viewMode, authLoading, user]); // ✅ Only re-run when actual data filters change!

  const money = (usd) => formatMoney(usd || 0, displayCurrency, rates);

  const amountBlock = (usd, size = "md") => {
    const main =
      size === "lg"
        ? "text-xl sm:text-2xl font-bold tracking-tight"
        : size === "sm"
          ? "text-sm font-semibold"
          : "text-base sm:text-lg font-semibold tracking-tight";
    return (
      <div className="space-y-0.5 min-w-0">
        <div
          className={`${main} text-slate-900 dark:text-white tabular-nums truncate`}
        >
          {formatMoney(usd || 0, "USD", rates)}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums leading-snug truncate">
          {formatMoney(usd || 0, "KHR", rates)}
          <span className="mx-1 opacity-40">·</span>
          {formatMoney(usd || 0, "THB", rates)}
        </div>
      </div>
    );
  };

  if ((loading || authLoading) && !summary && !charts) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label={t("loading")} />
      </div>
    );
  }

  // --- CALCULATION LOGIC ---
  let salary = 0;
  let bonus = 0;
  let savings = 0;
  let expenses = 0;
  let remittances = 0;
  let income = 0;

  if (viewMode === "month") {
    salary = summary?.salary?.totalUSD || 0;
    bonus = summary?.bonus?.totalUSD || 0;
    savings = summary?.savings?.totalUSD || 0;
    expenses = summary?.expenses?.totalUSD || 0;
    remittances = summary?.remittances?.totalUSD || 0;
    income = summary?.totalIncome || salary + bonus;
  } else if (viewMode === "year") {
    const yearTotals = charts?.yearTotals || {};
    salary = yearTotals.salary || 0;
    bonus = yearTotals.bonus || 0;
    savings = yearTotals.savings || 0;
    expenses = yearTotals.expenses || 0;
    remittances = yearTotals.remittances || 0;
    income = yearTotals.income || salary + bonus;
  } else if (viewMode === "all") {
    if (Array.isArray(charts?.byYear) && charts.byYear.length > 0) {
      salary = charts.byYear.reduce((acc, y) => acc + (y.salary || 0), 0);
      bonus = charts.byYear.reduce((acc, y) => acc + (y.bonus || 0), 0);
      savings = charts.byYear.reduce((acc, y) => acc + (y.savings || 0), 0);
      expenses = charts.byYear.reduce((acc, y) => acc + (y.expenses || 0), 0);
      remittances = charts.byYear.reduce(
        (acc, y) => acc + (y.remittances || 0),
        0,
      );
      income = charts.byYear.reduce(
        (acc, y) => acc + (y.income || (y.salary || 0) + (y.bonus || 0)),
        0,
      );
    } else {
      salary = summary?.salary?.totalUSD ?? charts?.yearTotals?.salary ?? 0;
      bonus = summary?.bonus?.totalUSD ?? charts?.yearTotals?.bonus ?? 0;
      savings = summary?.savings?.totalUSD ?? charts?.yearTotals?.savings ?? 0;
      expenses =
        summary?.expenses?.totalUSD ?? charts?.yearTotals?.expenses ?? 0;
      remittances =
        summary?.remittances?.totalUSD ?? charts?.yearTotals?.remittances ?? 0;
      income =
        summary?.totalIncome ?? charts?.yearTotals?.income ?? salary + bonus;
    }
  }

  const net = income - expenses;
  const spendRatio =
    income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0;
  const overspend = expenses > income && income > 0;

  const summaryBoxes = [
    {
      label: t("salary"),
      value: salary,
      to: "/salaries",
      icon: Banknote,
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      glow: "group-hover:shadow-emerald-500/10",
      bar: "bg-emerald-500",
    },
    {
      label: t("bonus"),
      value: bonus,
      to: "/bonuses",
      icon: Gift,
      iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      glow: "group-hover:shadow-violet-500/10",
      bar: "bg-violet-500",
    },
    {
      label: t("savings"),
      value: savings,
      to: "/savings",
      icon: PiggyBank,
      iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
      glow: "group-hover:shadow-teal-500/10",
      bar: "bg-teal-500",
    },
    {
      label: t("expenses"),
      value: expenses,
      to: "/expenses",
      icon: Wallet,
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      glow: "group-hover:shadow-rose-500/10",
      bar: "bg-rose-500",
    },
    {
      label: t("remittances"),
      value: remittances,
      to: "/remittances",
      icon: Send,
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      glow: "group-hover:shadow-amber-500/10",
      bar: "bg-amber-500",
    },
  ];

  const viewModeLabel =
    viewMode === "all"
      ? "All Time Total"
      : viewMode === "year"
        ? `Full Year ${year}`
        : `${tMonth(month)} ${year}`;

  const cardCls =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200";

  return (
    <div className="w-full min-h-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("dashboard")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {displayCurrency}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("overview")} · {viewModeLabel}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
            title={t("refresh")}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Timeframe & Date Switchers */}
      <div
        className={`${cardCls} rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80">
            {["month", "year", "all"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  viewMode === mode
                    ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t(
                  mode === "month"
                    ? "monthly"
                    : mode === "year"
                      ? "yearly"
                      : "allTime",
                )}
              </button>
            ))}
          </div>

          {viewMode !== "all" && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 p-1">
              {viewMode === "month" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer px-1"
                  >
                    {MONTHS.map((m, i) => (
                      <option
                        key={m}
                        value={i + 1}
                        className="bg-white dark:bg-slate-800"
                      >
                        {tMonth(i + 1)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                </>
              )}

              <button
                type="button"
                onClick={() => setYear((y) => y - 1)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold tabular-nums text-slate-900 dark:text-white outline-none cursor-pointer px-1"
              >
                {[
                  now.getFullYear(),
                  now.getFullYear() - 1,
                  now.getFullYear() - 2,
                ].map((y) => (
                  <option
                    key={y}
                    value={y}
                    className="bg-white dark:bg-slate-800"
                  >
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 px-4 py-3.5 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="font-semibold underline underline-offset-2 hover:no-underline shrink-0"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <section>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {summaryBoxes.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className={`group relative flex flex-col justify-between ${cardCls} rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${c.glow}`}
            >
              <div
                className={`absolute top-0 left-4 right-4 h-0.5 rounded-full ${c.bar} opacity-0 group-hover:opacity-100 transition-opacity`}
              />

              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-2xl ${c.iconBg} flex items-center justify-center shadow-inner`}
                >
                  <c.icon size={18} strokeWidth={2} />
                </div>
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowUpRight size={13} />
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  {c.label}
                </div>
                {amountBlock(c.value)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Budget & Overview Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Budget Card */}
        <section
          className={`xl:col-span-5 ${cardCls} rounded-3xl overflow-hidden`}
        >
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <PieChart size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white truncate">
                  {t("budgets") || "Budget"}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {viewModeLabel}
                </p>
              </div>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline transition shrink-0"
            >
              {budget ? t("edit") : t("addBudget") || "Add"}
            </Link>
          </div>

          <div className="p-5 sm:p-6">
            {budget ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: t("plannedIncome") || "Planned income",
                    value: budget.plannedIncomeUSD,
                    icon: TrendingUp,
                  },
                  {
                    label: t("savings"),
                    value: budget.savingsAmountUSD,
                    icon: PiggyBank,
                  },
                  {
                    label: t("remittances"),
                    value: budget.remittanceAmountUSD,
                    icon: Send,
                  },
                  {
                    label: t("spendingEnvelope") || "Spending",
                    value: budget.spendingAmountUSD,
                    icon: Wallet,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40 px-3.5 py-3.5"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <item.icon size={12} className="text-slate-400" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {item.label}
                      </span>
                    </div>
                    {amountBlock(item.value, "sm")}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3 text-slate-400 border border-slate-200 dark:border-slate-700">
                  <PieChart size={20} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-[200px]">
                  {t("noBudgetRecords")}
                </p>
                <Link
                  to="/budgets"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98]"
                >
                  <Plus size={15} />
                  {t("addBudget") || "Add budget"}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Financial Overview Card */}
        <section
          className={`xl:col-span-7 rounded-3xl ${cardCls} overflow-hidden ${
            overspend
              ? "border-rose-200/90 dark:border-rose-800/50 bg-gradient-to-br from-rose-50/50 via-white/80 to-white/80 dark:from-rose-950/20 dark:via-slate-800/80 dark:to-slate-800/80"
              : ""
          }`}
        >
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {overspend && (
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/15 text-rose-500 shrink-0">
                    <AlertTriangle size={15} />
                  </span>
                )}
                <span>
                  {viewModeLabel} — {t("overview")}
                </span>
              </h2>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    overspend
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                  }`}
                >
                  {spendRatio}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t("spendingOfIncome")}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                {t("net")}
              </div>
              <div
                className={`text-lg sm:text-xl font-black tabular-nums flex items-center justify-end gap-1.5 ${
                  net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {net >= 0 ? (
                  <TrendingUp size={18} />
                ) : (
                  <TrendingDown size={18} />
                )}
                {money(net)}
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 pt-5">
            <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                  overspend
                    ? "bg-gradient-to-r from-rose-500 via-rose-400 to-orange-400"
                    : "bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-400"
                }`}
                style={{ width: `${Math.min(100, spendRatio)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6">
            {[
              {
                label: t("income"),
                value: income,
                icon: TrendingUp,
                tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
              },
              {
                label: t("expenses"),
                value: expenses,
                icon: Wallet,
                tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
              },
              {
                label: t("savings"),
                value: savings,
                icon: PiggyBank,
                tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10",
              },
              {
                label: t("remittances"),
                value: remittances,
                icon: Send,
                tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40 px-3.5 py-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.tone}`}
                  >
                    <item.icon size={12} />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {item.label}
                  </span>
                </div>
                {amountBlock(item.value, "sm")}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
