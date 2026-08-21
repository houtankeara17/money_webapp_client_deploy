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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
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
