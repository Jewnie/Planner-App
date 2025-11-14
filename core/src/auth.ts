import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db.js"
import * as schema from "./db/schema.js"


// const baseURL = process.env.AUTH_URL // points to backend url
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET


export const auth = betterAuth({
  baseURL: "https://planner-app-tau.vercel.app",

  trustedOrigins: [
    "https://planner-app-tau.vercel.app",
    "http://localhost:5173",
    "https://planner-app-six-zeta.vercel.app"

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
      // ❌ NO domain here
    },
  },

  plugins: [],
});
