import express from "express"
import cors from "cors"

import "dotenv/config"

import { toNodeHandler, fromNodeHeaders } from "better-auth/node"

import { auth } from "./auth.js"

const app = express()
const port = Number(process.env.PORT) || 3000

const FRONTEND_URL = "https://planner-app-six-zeta.vercel.app"
const BACKEND_URL = "https://planner-app-tau.vercel.app"
const DEV_URL = "http://localhost:5173"

app.set("trust proxy", 1)

app.use(cors({
  origin: [
    FRONTEND_URL,
    DEV_URL,
    BACKEND_URL,
  ],
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