import { createAuthClient } from "better-auth/react"

// Use full origin (with protocol). In production set VITE_API_URL, e.g. "https://plnnr-app.johndev.org"
const apiBaseUrl =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

export const authClient = createAuthClient({
  baseURL: apiBaseUrl || undefined,
  fetchOptions: {
    credentials: "include",
  },
})
