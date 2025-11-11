import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { db } from "./db"
import * as schema from "./db/schema"

const port = Number(process.env.PORT) || 3000
const baseURL = process.env.AUTH_URL ?? `http://localhost:${port}`

export const auth = betterAuth({
  app: {
    baseURL,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [],
})

