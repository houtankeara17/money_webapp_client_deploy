import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

const persistSession = (payload) => {
  const access = payload.accessToken || payload.token;
  if (access) localStorage.setItem("token", access);
  if (payload.refreshToken)
    localStorage.setItem("refreshToken", payload.refreshToken);
  // store user without tokens
  const { token, accessToken, refreshToken, expiresIn, tokenType, ...user } =
    payload;
  localStorage.setItem("user", JSON.stringify(user));
  return user;
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard against duplicate OAuth calls (e.g. React 18 Strict Mode double-invoke)
  const isOAuthProcessing = useRef(false);

  const langMsg = (en, km) => {
    const lang = localStorage.getItem("language") || "en";
    return lang === "km" ? km : en;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        /* ignore */
      }
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.data);
          localStorage.setItem("user", JSON.stringify(res.data.data));
        })
        .catch(() => {
          clearSession();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const userData = persistSession(data.data);
    setUser(userData);
    toast.success(
      data.message || langMsg("Login successful!", "ចូលដោយជោគជ័យ!"),
    );
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    const userData = persistSession(data.data);
    setUser(userData);
    toast.success(
      data.message || langMsg("Registration successful!", "ចុះឈ្មោះដោយជោគជ័យ!"),
    );
    return data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } catch {
      /* ignore network errors on logout */
    }
    clearSession();
    setUser(null);
    toast.success(langMsg("Logged out successfully", "ចាកចេញដោយជោគជ័យ"));
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put("/auth/profile", payload);
    const next = data.data || { ...user, ...payload };
    setUser(next);
    localStorage.setItem("user", JSON.stringify(next));
    toast.success(
      data.message || langMsg("Profile updated", "បានធ្វើបច្ចុប្បន្នភាព"),
    );
    return next;
  };

  /** After Google OAuth redirect — may include refreshToken in query */
  const handleOAuthToken = async (token, refreshToken) => {
    if (isOAuthProcessing.current) return;
    isOAuthProcessing.current = true;

    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    try {
      const { data } = await api.get("/auth/me");
      const userData = persistSession({ ...data.data, token, refreshToken });
      setUser(userData);

      toast.success(
        langMsg("Google login successful!", "ចូល Google ដោយជោគជ័យ!"),
        { id: "oauth-success" }, // Unique toast ID prevents duplicate rendering
      );
      return userData;
    } catch (err) {
      toast.error("OAuth failed. Please try again.", { id: "oauth-error" });
      clearSession();
      throw err;
    } finally {
      isOAuthProcessing.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        updateProfile,
        handleOAuthToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
