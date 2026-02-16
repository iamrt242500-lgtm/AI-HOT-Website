"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, ApiError, ACCESS_TOKEN_KEY } from "@/lib/api";

interface User {
  id: number;
  email: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      api
        .getCurrentUser(token)
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const hydrateUser = async (token: string) => {
    const userData = await api.getCurrentUser(token);
    setUser(userData);
  };

  const signup = async (email: string, password: string) => {
    try {
      const { access_token } = await api.signup(email, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      await hydrateUser(access_token);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error("Signup failed");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { access_token } = await api.login(email, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      await hydrateUser(access_token);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error("Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
