import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

/** For login/register: if already logged in, go to dashboard */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

export default GuestRoute;
