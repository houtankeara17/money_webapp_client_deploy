import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import {
  LayoutDashboard,
  Wallet,
  Banknote,
  Gift,
  PiggyBank,
  Target,
  Send,
  ArrowRightLeft,
  StickyNote,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PieChart,
  User,
  ChevronDown,
  Globe,
  Languages,
  Check,
  Calculator,
  Copy,
  ClipboardPaste,
  History,
  Trash2,
  Delete,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "../common/ThemeToggle";
import Logo from "../common/Logo";
import PageNav from "../common/PageNav";
import { useI18n } from "../../hooks/useI18n";
import toast from "react-hot-toast";

const NAV_GROUPS = [
  {
    titleKey: "overview",
    defaultTitle: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, key: "dashboard" },
      { to: "/reports", icon: BarChart3, key: "reports" },
    ],
  },
  {
    titleKey: "moneyOperations",
    defaultTitle: "Money Operations",
    items: [
      { to: "/expenses", icon: Wallet, key: "expenses" },
      { to: "/salaries", icon: Banknote, key: "salary" },
      { to: "/bonuses", icon: Gift, key: "bonus" },
      { to: "/savings", icon: PiggyBank, key: "savings" },
      { to: "/budgets", icon: PieChart, key: "budgets" },
      { to: "/plans", icon: Target, key: "plans" },
      { to: "/remittances", icon: Send, key: "remittances" },
      { to: "/loans", icon: Banknote, key: "loans" },
      { to: "/exchange-logs", icon: ArrowRightLeft, key: "exchange" },
    ],
  },
  {
    titleKey: "toolsPreferences",
    defaultTitle: "Tools & Preferences",
    items: [
      { to: "/notes", icon: StickyNote, key: "notes" },
      { to: "/settings", icon: Settings, key: "settings" },
    ],
  },
];

const LayoutStyle2 = () => {
  const { user, logout, updateProfile } = useAuth();
  const { language, changeLanguage } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dropdown states for top navbar
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Advanced Calculator State
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcHistory, setCalcHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("pad"); // 'pad' or 'history'

  const handleCalcClick = (val) => {
    if (val === "C") {
      setCalcInput("");
    } else if (val === "DEL") {
      setCalcInput((prev) => prev.slice(0, -1));
    } else if (val === "=") {
      if (!calcInput) return;
      try {
        const sanitize = calcInput.replace(/[^0-9+\-*/.]/g, "");
        const evalResult = Function(`"use strict"; return (${sanitize})`)();
        const resultString = String(evalResult);

        // Add item to history log
        setCalcHistory((prev) => [
          {
            expression: calcInput,
            result: resultString,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...prev,
        ]);

        setCalcInput(resultString);
      } catch {
        toast.error(t("invalidExpression") || "Invalid expression");
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  const handleCopyResult = (textToCopy) => {
    const text = textToCopy || calcInput;
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t("copiedToClipboard") || "Copied to clipboard!");
  };

  const handlePasteInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const sanitizedText = text.replace(/[^0-9+\-*/.]/g, "");
      if (sanitizedText) {
        setCalcInput((prev) => prev + sanitizedText);
        toast.success(t("pastedClipboardValue") || "Pasted clipboard value");
      } else {
        toast.error(
          t("noValidNumericData") || "No valid numeric data in clipboard",
        );
      }
    } catch {
      toast.error(t("failedToReadClipboard") || "Failed to read clipboard");
    }
  };

  const currencyRef = useRef(null);
  const languageRef = useRef(null);
  const profileRef = useRef(null);
  const calcModalRef = useRef(null);

  const getCurrentPageTitle = () => {
    const allItems = NAV_GROUPS.flatMap((g) => g.items);
    const item = allItems.find((n) =>
      n.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(n.to),
    );
    return item ? t(item.key) : t("appName") || "MoneyFlow";
  };

  useEffect(() => {
    const title = getCurrentPageTitle();
    document.title = `${title} — MoneyFlow`;
  }, [location.pathname, language, t]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyRef.current && !currencyRef.current.contains(event.target)) {
        setCurrencyDropdownOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (
        calculatorOpen &&
        calcModalRef.current &&
        !calcModalRef.current.contains(event.target)
      ) {
        setCalculatorOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && calculatorOpen) {
        setCalculatorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [calculatorOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCurrencySelect = async (currency) => {
    try {
      await updateProfile({ currency });
      toast.success(
        `${t("currency") || t("currency") || "Currency"}: ${currency}`,
      );
    } catch (_) {
      toast.error(
        t("currencyUpdateFailed") || t("failed") || "Failed to update currency",
      );
    }
    setCurrencyDropdownOpen(false);
  };

  const handleLanguageSelect = async (lang) => {
    await changeLanguage(lang);
    toast.success(lang === "km" ? t("languageKhmer") : t("languageEnglish"));
    setLanguageDropdownOpen(false);
  };

  const label = (item) => t(item.key) || item.key;

  const currencies = [
    { code: "USD", symbol: "$", label: "USD ($)" },
    { code: "KHR", symbol: "៛", label: "KHR (៛)" },
    { code: "THB", symbol: "฿", label: "THB (฿)" },
  ];

  const languages = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "km", label: "ខ្មែរ", flag: "🇰🇭" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 flex flex-col transform transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                MoneyFlow
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Finance OS
              </p>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t(group.titleKey) || group.defaultTitle}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-teal-700 text-white font-semibold shadow-md shadow-teal-700/20"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }`
                    }
                  >
                    <item.icon size={17} className="shrink-0 opacity-80" />
                    <span className="truncate">{label(item)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={
                    user.avatar?.startsWith("/")
                      ? `http://localhost:5000${user.avatar}`
                      : user.avatar
                  }
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover shrink-0 ring-2 ring-teal-700/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              title={t("logout") || "Logout"}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="hidden sm:block text-sm font-bold text-slate-800 dark:text-slate-100">
              {getCurrentPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Calculator Action Button */}
            <button
              onClick={() => setCalculatorOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200/80 dark:border-slate-600 cursor-pointer flex items-center gap-1.5"
              title={t("calculator") || "Calculator"}
            >
              <Calculator size={16} />
            </button>

            {/* Language Switcher Dropdown */}
            <div className="relative" ref={languageRef}>
              <button
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200/80 dark:border-slate-600 cursor-pointer"
              >
                <Languages
                  size={14}
                  className="text-slate-500 dark:text-slate-400"
                />
                <span>{language === "km" ? "ខ្មែរ" : "English"}</span>
                <ChevronDown size={13} className="opacity-60" />
              </button>

              {languageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    {t("language") || "Language"}
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageSelect(l.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer ${
                        language === l.code
                          ? "font-bold text-teal-600 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-900/20"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {language === l.code && (
                        <Check
                          size={13}
                          className="text-teal-600 dark:text-teal-400"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Dropdown Menu */}
            <div className="relative" ref={currencyRef}>
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200/80 dark:border-slate-600 cursor-pointer"
              >
                <Globe
                  size={14}
                  className="text-slate-500 dark:text-slate-400"
                />
                <span>{user?.currency || "USD"}</span>
                <ChevronDown size={13} className="opacity-60" />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    {t("currency") || "Currency"}
                  </div>
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencySelect(c.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer ${
                        (user?.currency || "USD") === c.code
                          ? "font-bold text-teal-600 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-900/20"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>{c.label}</span>
                      {(user?.currency || "USD") === c.code && (
                        <Check
                          size={13}
                          className="text-teal-600 dark:text-teal-400"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* Profile & Controls Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {user?.avatar ? (
                  <img
                    src={
                      user.avatar?.startsWith("/")
                        ? `http://localhost:5000${user.avatar}`
                        : user.avatar
                    }
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <ChevronDown
                  size={13}
                  className="text-slate-500 dark:text-slate-400"
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate("/settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      <User size={15} className="text-slate-400" />
                      <span>{t("settings") || "Profile & Settings"}</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} />
                      <span>{t("logout") || "Logout"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 overflow-auto">
          <PageNav />
          <Outlet />
        </main>
      </div>

      {/* Modern Calculator Modal */}
      {calculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={calcModalRef}
            className="bg-white dark:bg-slate-800/95 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Calculator
                  size={18}
                  className="text-teal-600 dark:text-teal-400"
                />
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {t("calculator") || "Calculator"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setActiveTab(activeTab === "pad" ? "history" : "pad")
                  }
                  className={`p-1.5 rounded-lg transition ${
                    activeTab === "history"
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={t("history") || "History"}
                >
                  <History size={16} />
                </button>
                <button
                  onClick={() => setCalculatorOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Screen & Display */}
            <div className="p-5">
              <div className="relative bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-end min-h-[90px] mb-4">
                <span className="text-right text-xs font-mono text-slate-400 dark:text-slate-500 mb-1 h-4 overflow-x-auto whitespace-nowrap">
                  {calcInput ? calcInput : " "}
                </span>
                <div
                  onClick={() => handleCopyResult()}
                  className="flex items-center justify-between cursor-pointer group"
                  title={t("clickToCopy") || "Click to copy"}
                >
                  <span className="text-2xl font-mono font-bold tracking-tight text-slate-800 dark:text-white truncate">
                    {calcInput || "0"}
                  </span>
                  <Copy
                    size={14}
                    className="text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition"
                  />
                </div>
              </div>

              {activeTab === "pad" ? (
                <>
                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      onClick={() => handleCopyResult()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    >
                      <Copy size={13} />
                      <span>{t("copy") || "Copy"}</span>
                    </button>
                    <button
                      onClick={handlePasteInput}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    >
                      <ClipboardPaste size={13} />
                      <span>{t("paste") || "Paste"}</span>
                    </button>
                  </div>

                  {/* Calculator Pad Grid */}
                  <div className="grid grid-cols-4 gap-2 font-semibold">
                    <button
                      onClick={() => handleCalcClick("C")}
                      className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/20 active:scale-95 transition"
                    >
                      C
                    </button>
                    <button
                      onClick={() => handleCalcClick("DEL")}
                      className="p-3.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition flex items-center justify-center"
                    >
                      <Delete size={17} />
                    </button>
                    <button
                      onClick={() => handleCalcClick("/")}
                      className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition"
                    >
                      ÷
                    </button>
                    <button
                      onClick={() => handleCalcClick("*")}
                      className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition"
                    >
                      ×
                    </button>

                    {["7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleCalcClick(num)}
                        className="p-3.5 bg-slate-50 dark:bg-slate-700/40 text-slate-800 dark:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition border border-slate-100 dark:border-slate-700/40"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleCalcClick("-")}
                      className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition"
                    >
                      -
                    </button>

                    {["4", "5", "6"].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleCalcClick(num)}
                        className="p-3.5 bg-slate-50 dark:bg-slate-700/40 text-slate-800 dark:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition border border-slate-100 dark:border-slate-700/40"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleCalcClick("+")}
                      className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition"
                    >
                      +
                    </button>

                    <div className="col-span-3 grid grid-cols-3 gap-2">
                      {["1", "2", "3", "0", "."].map((item) => (
                        <button
                          key={item}
                          onClick={() => handleCalcClick(item)}
                          className={`p-3.5 bg-slate-50 dark:bg-slate-700/40 text-slate-800 dark:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition border border-slate-100 dark:border-slate-700/40 ${
                            item === "0" ? "col-span-2" : ""
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCalcClick("=")}
                      className="p-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl active:scale-95 transition shadow-lg shadow-teal-600/20 flex items-center justify-center text-lg"
                    >
                      =
                    </button>
                  </div>
                </>
              ) : (
                /* History List Tab */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t("pasteOperation") || "Recent Calculations"}
                    </span>
                    {calcHistory.length > 0 && (
                      <button
                        onClick={() => setCalcHistory([])}
                        className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        {t("clear") || "Clear"}
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {calcHistory.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {t("noCalculationHistoryYet") ||
                          "No calculation history yet"}
                      </div>
                    ) : (
                      calcHistory.map((item, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setCalcInput(item.result);
                            setActiveTab("pad");
                          }}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-100 dark:border-slate-700/50 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-[11px] font-mono text-slate-400">
                              {item.expression}
                            </p>
                            <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                              = {item.result}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyResult(item.result);
                            }}
                            className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 opacity-0 group-hover:opacity-100 transition"
                            title={t("copyResult") || "Copy Result"}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutStyle2;
