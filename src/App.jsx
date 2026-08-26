import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Register from "./pages/auth/Register";
import OAuthCallback from "./pages/auth/OAuthCallback";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Salary from "./pages/Salary";
import Bonus from "./pages/Bonus";
import Savings from "./pages/Savings";
import Plans from "./pages/Plans";
import Remittances from "./pages/Remittances";
import ExchangeLog from "./pages/ExchangeLog";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Budgets from "./pages/Budgets";
import Loans from "./pages/Loans";
import ProtectedRoute from "./routes/ProtectedRoute";
import GuestRoute from "./routes/GuestRoute";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-2xl shadow-teal-500/10 backdrop-blur-md">
          
          {/* Multi-Layer Animated Dot */}
          <div className="relative flex h-3.5 w-3.5 items-center justify-center">
            {/* Ambient Outer Blur */}
            <span className="absolute h-6 w-6 rounded-full bg-teal-500/30 blur-sm animate-pulse"></span>
            
            {/* Expanding Wave */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
            
            {/* Pulsing Outer Ring */}
            <span className="absolute inline-flex h-4 w-4 animate-pulse rounded-full border border-teal-300/40"></span>

            {/* Glowing Core Dot */}
            <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf]"></span>
          </div>

          {/* Text with Bouncing Ellipsis */}
          <div className="flex items-center text-sm font-semibold text-slate-200 tracking-wide">
            <span>Connecting</span>
            <span className="inline-flex ml-1 space-x-1">
              <span className="animate-bounce text-teal-400" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce text-teal-400" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce text-teal-400" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route path="/oauth-callback" element={<OAuthCallback />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="salaries" element={<Salary />} />
        <Route path="bonuses" element={<Bonus />} />
        <Route path="savings" element={<Savings />} />
        <Route path="plans" element={<Plans />} />
        <Route path="remittances" element={<Remittances />} />
        <Route path="exchange-logs" element={<ExchangeLog />} />
        <Route path="loans" element={<Loans />} />
        <Route path="notes" element={<Notes />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
