import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { handleOAuthToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("accessToken") || searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    if (token) {
      handleOAuthToken(token, refreshToken)
        .then(() => navigate("/", { replace: true }))
        .catch(() => navigate("/login", { replace: true }));
    } else {
      navigate("/login?error=oauth_failed", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-slate-300">Completing Google login...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
