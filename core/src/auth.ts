import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db.js"
import * as schema from "./db/schema.js"

const backendBaseUrl = "https://planner-app-tau.vercel.app"
const dashboardBaseUrl = "https://planner-app-six-zeta.vercel.app"
const localDevUrl = "http://localhost:5173"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const auth = betterAuth({
  baseURL: backendBaseUrl,

  trustedOrigins: [
    backendBaseUrl,
    dashboardBaseUrl,
    localDevUrl,
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
      sameSite: "none",
    },
  },
 

  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: "planner-app-six-zeta.vercel.app", // your domain
  },
  },

  

  plugins: [],
});
