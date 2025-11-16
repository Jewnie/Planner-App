import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db.js"
import * as schema from "./db/schema.js"

const appUrl = process.env.APP_URL
const apiUrl = process.env.API_URL 

const trustedOrigins = Array.from(
  new Set(
    [
      appUrl,
      apiUrl,
    ].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
)

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const auth = betterAuth({
  // baseURL must be a full origin (with protocol)
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
    },
  },
  plugins: [],
})
