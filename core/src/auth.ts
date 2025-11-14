import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db.js"
import * as schema from "./db/schema.js"

const port = Number(process.env.PORT) || 3000
const baseURL = process.env.AUTH_URL ?? `http://localhost:${port}`
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

const frontendOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.replace(/\/$/, "")
  : undefined

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [
    baseURL,
    "http://localhost:5173",
    ...(frontendOrigin ? [frontendOrigin] : []),
  ],
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
      sameSite: "none",  // import: MUST be none for cross-domain
      domain: baseURL,
    },
  },
  
  plugins: [],
})

