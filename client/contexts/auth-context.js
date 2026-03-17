"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek auth saat pertama kali load
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (error) {
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, confirmPassword) => {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
      confirmPassword,
    });
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Tetap logout di client walaupun server error
    }
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  };

  const resetPassword = async (token, password, confirmPassword) => {
    const { data } = await api.post("/auth/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return data;
  };

  const verifyEmail = async (token) => {
    const { data } = await api.post("/auth/verify-email", { token });
    return data;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  };

  // ─── Profile management ────────────────────────────

  const updateProfile = async (profileData) => {
    const { data } = await api.put("/users/me", profileData);
    setUser(data.user);
    return data.user;
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const { data } = await api.put("/users/me/password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  };

  const updateAvatar = async (avatarUrl) => {
    const { data } = await api.put("/users/me/avatar", {
      avatar: avatarUrl,
    });
    setUser(data.user);
    return data.user;
  };

  const updateNotifications = async (notificationPreferences, dueDateReminders) => {
    const { data } = await api.put("/users/me/notifications", {
      notificationPreferences,
      dueDateReminders,
    });
    setUser(data.user);
    return data.user;
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/users/me");
      setUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        checkAuth,
        updateProfile,
        changePassword,
        updateAvatar,
        updateNotifications,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
