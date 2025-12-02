import express from "express"
import cors from "cors"

import "dotenv/config"

import { toNodeHandler, fromNodeHeaders } from "better-auth/node"

import { auth } from "./auth.js"
import { createContext } from "./trpc.js"
import { appRouter } from "./routers/index.js"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import { processCalendarWatchNotification } from "./lib/process-calendar-watch-notification.js"


const app = express()
const port = Number(process.env.PORT) || 3000

const APP_URL = process.env.APP_URL
const API_URL = process.env.API_URL ?? APP_URL

const allowedOrigins = Array.from(
  new Set(
    [
      APP_URL,
      API_URL,
    ].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
)

app.set("trust proxy", 1) // todo: check if necessary

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

app.use("/trpc", createExpressMiddleware({
  router: appRouter,
  createContext,
}))

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


app.post("/google-calendar-webhook", async (req, res) => {
  const headers = req.headers;

  console.log("Google webhook headers:", headers);
  console.log("Webhook body:", req.body);
  
  // Google requires a 200 response immediately
  res.status(200).send();

  const channelId = headers['x-goog-channel-id'] as string;
  const resourceId = headers['x-goog-resource-id'] as string;
  const resourceState = headers['x-goog-resource-state'] as string;
  const messageNumber = headers['x-goog-message-number'] as string;

  // Validate that this is an actual Google webhook with required headers
  if (!channelId || !resourceId || !resourceState) {
    console.warn("Invalid Google webhook: missing required headers", { channelId, resourceId, resourceState });
    return;
  }

  // Only process actual push notifications (resourceState === 'exists')
  // Skip 'sync' (initial channel creation) and 'not_exists' (resource deleted) notifications
  if (resourceState !== 'exists') {
    console.log(`Skipping webhook notification with resourceState: ${resourceState} (only processing 'exists' notifications)`);
    return;
  }

  // Process asynchronously - don't await to avoid blocking the response
  processCalendarWatchNotification({ channelId, resourceId, resourceState, messageNumber })
    .catch((error) => {
      console.error("Failed to process calendar watch notification:", error);
    });
});

if (process.env.NODE_ENV === "dev") {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
    if (!process.env.WEBHOOK_URL && !process.env.API_URL) {
      console.warn("⚠️  WEBHOOK_URL or API_URL not set. Google Calendar webhooks will not work.");
    }
  })
} else {
  // In production, ensure API_URL is set
  if (!process.env.API_URL) {
    console.warn("Warning: API_URL environment variable is not set. Google Calendar webhooks may not work.");
  }
}

export default app
