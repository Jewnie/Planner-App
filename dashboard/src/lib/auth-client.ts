import { createAuthClient } from "better-auth/react"

const getAuthBaseURL = () => {
  const envBase =
    import.meta.env.VITE_AUTH_URL ||
    // Vercel exposes NEXT_PUBLIC_ vars automatically; honor that just in case.
    import.meta.env.NEXT_PUBLIC_AUTH_URL

  if (envBase) {
    return envBase
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`
  }

  // During SSR or static prerender, fall back to localhost (dev)
  return "http://localhost:3000/api/auth"
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})