import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db.js"
import * as schema from "./db/schema.js"

const appUrl = process.env.APP_URL
const apiUrl = process.env.API_URL ?? appUrl
const devUrl = process.env.DEV_URL ?? "http://localhost:5173"
const extraTrustedOrigins = process.env.TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []
const cookieDomain = process.env.COOKIE_DOMAIN

const trustedOrigins = Array.from(
  new Set(
    [appUrl, apiUrl, devUrl, "planner-app-eta-sage.vercel.app/dashboard", ...extraTrustedOrigins].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
)

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const auth = betterAuth({
  baseURL: apiUrl ?? "http://localhost:3000",

  trustedOrigins,

  socialProviders: googleClientId && googleClientSecret ? {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  } : undefined,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  cookies: {
    session: {
      secure: true,
      sameSite: "none",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    },
  },

  advanced: cookieDomain ? {
    crossSubDomainCookies: {
      enabled: true,
      domain: cookieDomain,
    },
  } : undefined,

  plugins: [],
})
