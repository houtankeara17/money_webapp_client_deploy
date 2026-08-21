import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Drive server message language (login still works before user is loaded)
  const lang =
    localStorage.getItem("language") ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}").language;
      } catch {
        return null;
      }
    })() ||
    "en";
  config.headers["X-Language"] = lang === "km" ? "km" : "en";
  return config;
});

let refreshing = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");

  // Use plain axios to avoid interceptor loop
  const { data } = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 15000 },
  );

  const access = data?.data?.accessToken || data?.data?.token;
  const nextRefresh = data?.data?.refreshToken;

  if (!access) throw new Error("Refresh failed");

  localStorage.setItem("token", access);
  if (nextRefresh) localStorage.setItem("refreshToken", nextRefresh);
  return access;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Try refresh once on 401 (skip auth endpoints)
    const url = original?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot") ||
      url.includes("/auth/reset");

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = refreshAccessToken().finally(() => {
            refreshing = null;
          });
        }
        const access = await refreshing;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
