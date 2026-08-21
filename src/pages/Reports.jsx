import { useEffect, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { useAuth } from "../store/AuthContext";
import { formatMoney } from "../utils/currencyDisplay";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Send,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

const PIE_COLORS = [
  "#0f766e",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#f97316",
  "#64748b",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs text-slate-100 min-w-[140px]">
        {label && (
          <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1">
            {label}
          </p>
        )}
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold tabular-nums text-slate-100">
                ${Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Reports = () => {
  useDocumentTitle("Reports");
  const { t, tMonthShort } = useI18n();
  const { user } = useAuth();
  const rates = {
    exchangeRateKhr: user?.exchangeRateKhr,
    exchangeRateThb: user?.exchangeRateThb,
  };
  const displayCurrency = user?.currency || "USD";
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [viewMode, setViewMode] = useState("year"); // "month" | "year" | "all"
  const [year, setYear] = useState(currentYear);
  const [monthNumber, setMonthNumber] = useState(currentMonth);
  const [availableYears, setAvailableYears] = useState([currentYear]);

  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    remittances: 0,
    net: 0,
    expenseCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};

      if (viewMode === "all") {
        params.allTime = "true";
      } else {
        params.year = year;
        if (viewMode === "month") {
          params.monthNumber = monthNumber;
        }
      }

      const { data } = await api.get("/reports/charts", { params });

      setMonthlyTrend(
        (data.data.monthlyTrend || []).map((row) => ({
          ...row,
          month: tMonthShort(row.monthNumber) || row.month,
        })),
      );
      setByCategory(data.data.expensesByCategory || []);
      setTotals(data.data.yearTotals || {});
      setAvailableYears(data.data.availableYears || [year]);
    } catch {
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, year, monthNumber]);

  const canPrevYear = availableYears.some((y) => y < year) || year > 2020;
  const canNextYear = year < currentYear;

  const handlePrevMonth = () => {
    if (monthNumber === 1) {
      setMonthNumber(12);
      setYear((y) => y - 1);
    } else {
      setMonthNumber((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (monthNumber === 12) {
      setMonthNumber(1);
      setYear((y) => y + 1);
    } else {
      setMonthNumber((m) => m + 1);
    }
  };

  // Modern UI Classes matching ExchangeLog theme
  const cardCls =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200";

  const summaryCards = [
    {
      label: t("income"),
      value: totals.income,
      sub: t("salaryPBonus"),
      icon: TrendingUp,
      tone: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: t("expenses"),
      value: totals.expenses,
      sub: `${totals.expenseCount || 0} ${t("transactions")}`,
      icon: TrendingDown,
      tone: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    {
      label: t("savings") || "Savings",
      value: totals.savings,
      sub: t("totalSaved"),
      icon: PiggyBank,
      tone: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    },
    {
      label: t("net") || "Net",
      value: totals.net,
      sub: `${t("income")} − ${t("expenses")}`,
      icon: Wallet,
      tone:
        totals.net >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      iconBg:
        totals.net >= 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="w-full min-h-full space-y-6 pb-12">
      {/* Header Banner matching ExchangeLog */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("reports")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {displayCurrency}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {t("amountsInUsd")} ·{" "}
            {viewMode === "all"
              ? "All Time"
              : viewMode === "month"
                ? `${tMonthShort(monthNumber)} ${year}`
                : year}
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`${cardCls} rounded-2xl p-4 flex items-center gap-4`}
          >
            <div
              className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}
            >
              <card.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {card.label}
              </p>
              <p className={`text-xl font-black tabular-nums ${card.tone}`}>
                {formatMoney(card.value, displayCurrency, rates)}
              </p>
              {card.sub && (
                <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">
                  {card.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar: Timeframe Navigation */}
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

          {/* Timeframe Selectors */}
          {viewMode === "month" && (
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold tabular-nums px-3 text-center text-slate-900 dark:text-white">
                {tMonthShort(monthNumber)} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {viewMode === "year" && (
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 p-1">
              <button
                type="button"
                disabled={!canPrevYear}
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
                disabled={!canNextYear}
                onClick={() => setYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <LoadingSpinner label={t("loading")} />
        </div>
      ) : (
        <>
          {/* Main Income vs Expense Chart */}
          <section className={`${cardCls} rounded-3xl p-5 sm:p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">
                  {t("income")} vs {t("expenses")}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  {t("monthlyTrendBreakdown")}
                </p>
              </div>
            </div>
            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrend}
                  margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    strokeOpacity={0.15}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t("income")}
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 0, fill: "#22c55e" }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name={t("expenses")}
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 0, fill: "#ef4444" }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name={t("net") || "Net"}
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, strokeWidth: 0, fill: "#0ea5e9" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Two Column Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Savings & Remittances */}
            <section className={`${cardCls} rounded-3xl p-5 sm:p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Send size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">
                    {t("savingsAndRemittances")}
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    {t("monthlyBreakdown")}
                  </p>
                </div>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyTrend}
                    margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      strokeOpacity={0.15}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="savings"
                      name={t("savings") || "Savings"}
                      fill="#0ea5e9"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="remittances"
                      name={t("remittances") || "Remittances"}
                      fill="#a855f7"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Expenses by Category Pie */}
            <section className={`${cardCls} rounded-3xl p-5 sm:p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <PieChartIcon size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">
                    {t("expenses")} · {t("category")}
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    {t("shareofSpending")}
                  </p>
                </div>
              </div>
              {byCategory.length === 0 ? (
                <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Wallet size={22} />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t("noExpenseData")}
                  </p>
                </div>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={{ stroke: "#64748b", strokeWidth: 1 }}
                      >
                        {byCategory.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                            stroke="transparent"
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Category Breakdown Table */}
          {byCategory.length > 0 && (
            <section className={`${cardCls} rounded-3xl p-2 overflow-hidden`}>
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/80">
                <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">
                  {t("categoryBreakdown")}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  {byCategory.length} {t("categories")}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">{t("category")}</th>
                      <th className="p-4 text-right">{t("amount")}</th>
                      <th className="p-4 text-right hidden sm:table-cell">
                        {t("count")}
                      </th>
                      <th className="p-4 text-right">{t("share")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {byCategory.map((c, idx) => {
                      const pct =
                        totals.expenses > 0
                          ? ((c.value / totals.expenses) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr
                          key={c.name}
                          className="hover:bg-teal-500/5 transition-colors group"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                style={{
                                  backgroundColor:
                                    PIE_COLORS[idx % PIE_COLORS.length],
                                }}
                              />
                              <span className="font-bold text-slate-900 dark:text-white">
                                {t(`label_${c.name}`)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                            ${Number(c.value).toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-500 dark:text-slate-400 tabular-nums hidden sm:table-cell">
                            {c.count}
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-3 justify-end">
                              <div className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, Number(pct))}%`,
                                    backgroundColor:
                                      PIE_COLORS[idx % PIE_COLORS.length],
                                  }}
                                />
                              </div>
                              <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
