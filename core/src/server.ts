import express from "express"
import cors from "cors"

import "dotenv/config"

import { toNodeHandler, fromNodeHeaders } from "better-auth/node"

import { auth } from "./auth.js"

const app = express()
const port = Number(process.env.PORT) || 3000

const APP_URL = process.env.APP_URL
const API_URL = process.env.API_URL ?? APP_URL
const DEV_URL = process.env.DEV_URL ?? "http://localhost:5173"
const EXTRA_ORIGINS = process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []

const allowedOrigins = Array.from(
  new Set(
    [
      APP_URL,
      API_URL,
      DEV_URL,
      ...EXTRA_ORIGINS,
      // Add any preview/staging origins via CORS_ORIGINS env rather than hardcoding
      "https://planner-app-eta-sage.vercel.app",
      "https://plnnr-app.johndev.org",
    ].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
)

app.set("trust proxy", 1)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
}))

app.use("/api/auth", toNodeHandler(auth))

app.use(express.json())

app.get("/", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/session", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })

    if (!session) {
      return res.status(401).json({ session: null })
    }

    return res.json(session)
  } catch (error) {
    console.error("Failed to get session", error)
    return res.status(500).json({ error: "Failed to fetch session" })
  }
})
if(process.env.NODE_ENV === "dev") {
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
}

export default app