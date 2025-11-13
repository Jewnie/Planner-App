import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../../core/src/db"; // your drizzle instance

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
    }),
    trustedOrigins: [
        "http://localhost:5173",
    ],
    socialProviders: { 
        google: { 
          clientId: googleClientId as string, 
          clientSecret: googleClientSecret as string, 
        }, 
    },
});