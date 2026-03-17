import axios from "axios";
import { getApiUrl, switchServer } from "./server-manager";

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiUrl();
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function isNetworkError(error) {
  // Axios sets `error.response` only when a response was received.
  if (!error?.response) return true;
  // Defensive: treat explicit timeout as network-level failure.
  if (error?.code === "ECONNABORTED") return true;
  return false;
}

// Response interceptor — handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Failover on network error (server down / unreachable / timeout), retry once
    if (isNetworkError(error) && originalRequest && !originalRequest._failoverRetry) {
      originalRequest._failoverRetry = true;
      switchServer({ type: "network_error", message: error?.message });
      originalRequest.baseURL = getApiUrl();
      return api(originalRequest);
    }

    // Jika 401 dan belum retry, coba refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${getApiUrl()}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.accessToken;
        localStorage.setItem("accessToken", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh gagal — redirect ke login
        localStorage.removeItem("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
