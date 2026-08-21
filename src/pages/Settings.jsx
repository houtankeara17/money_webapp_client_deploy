import { useState, useEffect, useRef } from "react";
import { useAuth } from "../store/AuthContext";
import { useTheme } from "../store/ThemeContext";
import api from "../services/api";
import toast from "react-hot-toast";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useI18n from "../hooks/useI18n";
import { ThemeCards, ThemeSwitch } from "../components/common/ThemeToggle";
import {
  Save,
  Lock,
  User,
  Palette,
  Globe,
  DollarSign,
  Sparkles,
  Camera,
  Trash2,
  Check,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

const CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "KHR", label: "Cambodian Riel (KHR)", symbol: "៛" },
  { code: "THB", label: "Thai Baht (THB)", symbol: "฿" },
];

const Settings = () => {
  useDocumentTitle("Settings");
  const { t } = useI18n();
  const { user, updateUser } = useAuth();
  const { theme, language, changeLanguage, changeCurrency } = useTheme();

  const avatarRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    avatar: "",
    currency: "USD",
    exchangeRateKhr: 4100,
    exchangeRateThb: 36.5,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Synchronize state when user context is initialized or changed
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        avatar: user.avatar || "",
        currency: user.currency || "USD",
        exchangeRateKhr: user.exchangeRateKhr ?? 4100,
        exchangeRateThb: user.exchangeRateThb ?? 36.5,
      });
    }
  }, [user?.id]);

  // Reset image error state whenever avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [profile.avatar]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put("/auth/profile", {
        name: profile.name,
        avatar: profile.avatar,
        currency: profile.currency,
        exchangeRateKhr: Number(profile.exchangeRateKhr),
        exchangeRateThb: Number(profile.exchangeRateThb),
        theme,
        language,
      });
      if (data?.data) {
        updateUser(data.data);
      }
      toast.success(data.message || t("success"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const { data: uploadRes } = await api.post("/upload", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const url = uploadRes.data?.url || "";
      setProfile((prev) => ({ ...prev, avatar: url }));

      const { data: profileRes } = await api.put("/auth/profile", {
        avatar: url,
      });
      if (profileRes.data) {
        updateUser(profileRes.data);
      }
      toast.success(t("success"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setUploadingAvatar(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setProfile((prev) => ({ ...prev, avatar: "" }));
    try {
      const { data } = await api.put("/auth/profile", { avatar: "" });
      if (data?.data) {
        updateUser(data.data);
      }
      toast.success(t("success"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    }
  };

  const handleCurrencyChange = async (code) => {
    setProfile((p) => ({ ...p, currency: code }));
    try {
      await changeCurrency(code);
      toast.success(`${t("currency")}: ${code}`);
    } catch {
      toast.error(t("failed"));
    }
  };

  const handleLanguageClick = async (lang) => {
    await changeLanguage(lang);
    toast.success(lang === "km" ? "ភាសា: ខ្មែរ" : "Language: English");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error("Min 6 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const { data } = await api.put("/auth/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success(data.message || t("success"));
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || t("failed"));
    } finally {
      setSavingPassword(false);
    }
  };

  const getAvatarSrc = (avatar) => {
    if (!avatar) return "";
    if (avatar.startsWith("http://") || avatar.startsWith("https://"))
      return avatar;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  // Shared glassmorphism card styling identical to ExchangeLog and Dashboard
  const cardCls =
    "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-200";

  return (
    <div className="w-full min-h-full space-y-6 pb-12">
      {/* Header Banner - Matching ExchangeLog & Dashboard Gradient */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("settings")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 text-teal-300 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md border border-teal-500/30">
              <Sparkles size={12} />
              {profile.currency || "USD"}
            </span>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            {language === "km"
              ? "ការផ្លាស់ប្តូរអនុវត្តភ្លាមៗ"
              : "Preferences & Personalization"}
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* ========== Appearance ========== */}
        <section
          className={`${cardCls} rounded-3xl overflow-hidden lg:col-span-2 xl:col-span-1`}
        >
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Palette size={18} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white">
              {t("appearance")}
            </h2>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("theme")}
            </p>
            <ThemeCards />
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("quickToggle")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("quickToggleDesc")}
                </p>
              </div>
              <ThemeSwitch />
            </div>
          </div>
        </section>

        {/* ========== Language ========== */}
        <section className={`${cardCls} rounded-3xl overflow-hidden`}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white">
              {t("language")}
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: "en", label: "English", flag: "🇺🇸" },
                { code: "km", label: "ខ្មែរ", flag: "🇰🇭" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageClick(l.code)}
                  className={`group relative flex flex-col items-center justify-center py-4 px-3 rounded-2xl border text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    language === l.code
                      ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xl mb-1">{l.flag}</span>
                  <span className="font-bold">{l.label}</span>
                  {language === l.code && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ========== Currency & Rates ========== */}
        <section className={`${cardCls} rounded-3xl overflow-hidden`}>
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white truncate">
                {t("currency")}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {t("defaultCurrency")}
              </p>
            </div>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-3 gap-2.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCurrencyChange(c.code)}
                  className={`relative py-3.5 px-2 rounded-2xl border text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                    profile.currency === c.code
                      ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="text-xl font-extrabold leading-none mb-1">
                    {c.symbol}
                  </div>
                  <div className="text-[11px] font-medium opacity-80">
                    {c.code}
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("exchangeRates")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    KHR / 1 USD
                  </label>
                  <input
                    type="number"
                    value={profile.exchangeRateKhr}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        exchangeRateKhr: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all tabular-nums text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    THB / 1 USD
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.exchangeRateThb}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        exchangeRateThb: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all tabular-nums text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Save size={16} />
                {savingProfile ? t("loading") : t("save")}
              </button>
            </form>
          </div>
        </section>

        {/* ========== Profile ========== */}
        <section
          className={`${cardCls} rounded-3xl overflow-hidden lg:col-span-2 xl:col-span-2`}
        >
          <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white">
              {t("profile")}
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
                <div className="relative shrink-0 group">
                  {profile.avatar && !imageError ? (
                    <img
                      src={getAvatarSrc(profile.avatar)}
                      alt="Profile Avatar"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-teal-500/20 shadow-md transition-transform duration-300 group-hover:scale-105"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-inner ring-4 ring-teal-500/20">
                      {(profile.name || user?.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {t("profilePhoto")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t("fileTypeLimit")}
                    </p>
                  </div>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarRef.current?.click()}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-xs font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <Camera size={14} />
                      {uploadingAvatar ? t("loading") : t("changeAvatar")}
                    </button>
                    {profile.avatar && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        onClick={handleRemoveAvatar}
                      >
                        <Trash2 size={14} />
                        {t("remove")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("displayName")}
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("email")}
                  </label>
                  <input
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-700/50 text-slate-400 cursor-not-allowed text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Save size={16} />
                {t("saveProfile")}
              </button>
            </form>
          </div>
        </section>

        {/* ========== Change Password ========== */}
        {user?.authProvider === "local" && (
          <section
            className={`${cardCls} rounded-3xl overflow-hidden lg:col-span-2 xl:col-span-1`}
          >
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Lock size={18} />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {t("changePassword")}
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("currentPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all text-sm text-slate-900 dark:text-white"
                    />
                    <KeyRound
                      size={15}
                      className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("newPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all text-sm text-slate-900 dark:text-white"
                    />
                    <Lock
                      size={15}
                      className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("confirmPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-all text-sm text-slate-900 dark:text-white"
                    />
                    <ShieldCheck
                      size={15}
                      className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-sm font-semibold shadow-md shadow-teal-700/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Lock size={16} />
                  {t("updatePassword")}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
