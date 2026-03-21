// frontend/lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("ch_token") : null;

export const setToken = (token: string) => localStorage.setItem("ch_token", token);
export const clearToken = () => localStorage.removeItem("ch_token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const api = {
  // Auth
  login: async (accessKey: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey, password }),
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  // Credits
  getCredits: async () => {
    const res = await fetch(`${BASE_URL}/api/credits`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  canAfford: async (amount: number) => {
    const res = await fetch(`${BASE_URL}/api/credits/check`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    });
    return res.json();
  },
};