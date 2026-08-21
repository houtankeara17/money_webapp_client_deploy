import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import Logo from "../../components/common/Logo";

const ForgotPassword = () => {
  useEffect(() => {
    document.title = "Forgot Password — MoneyFlow";
  }, []);

  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Email + Last Pwd, Step 2: Code + New Pwd

  // Form states
  const [email, setEmail] = useState("");
  const [lastPassword, setLastPassword] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  // Toggles for password visibility
  const [showLastPassword, setShowLastPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // STEP 1: Verify Email + Last Password
  const handleVerifyCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password/verify-user", {
        email: email.trim().toLowerCase(),
        lastPassword,
      });

      toast.success(data.message || "Credentials verified! Check your code.");

      if (data.data?.resetCode) {
        setDevCode(data.data.resetCode);
        setCode(data.data.resetCode);
      }

      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Submit Code + New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (code.trim().length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    if (password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.put("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      });

      toast.success("Password successfully updated!");

      // Auto-login flow if token is returned
      if (data.data?.accessToken) {
        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
        {/* Header Logo */}
        <div className="flex justify-center mb-6">
          <Logo size={44} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {step === 1 ? "Verify Your Account" : "Enter Code & New Password"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {step === 1
              ? "Provide your email and your last known password."
              : `Enter the code sent to ${email} and set your new password.`}
          </p>
        </div>

        {step === 1 ? (
          /* STEP 1 FORM */
          <form onSubmit={handleVerifyCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Last / Current Password
              </label>
              <div className="relative">
                <input
                  type={showLastPassword ? "text" : "password"}
                  required
                  value={lastPassword}
                  onChange={(e) => setLastPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLastPassword(!showLastPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showLastPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-700 text-white font-semibold shadow-md hover:bg-teal-600 transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Send Code"}
            </button>
          </form>
        ) : (
          /* STEP 2 FORM */
          <form onSubmit={handleResetPassword} className="space-y-4">
            {devCode && (
              <div className="text-xs p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex justify-between">
                <span>Dev Code:</span>
                <strong className="font-mono">{devCode}</strong>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-teal-600"
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-teal-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-700 text-white font-semibold shadow-md hover:bg-teal-600 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              ← Back to verification
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-600"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
