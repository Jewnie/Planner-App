import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";

// Import the AppRouter type from the backend (type-only import, erased at runtime)
// Type-only imports are safe for production builds as they don't create runtime dependencies
import type { AppRouter } from "../../../core/src/routers/index.js";

// Create typed tRPC React hooks with full type inference
export const trpc = createTRPCReact<AppRouter>();

const apiBaseUrl = import.meta.env.VITE_API_URL || "";

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          opts.direction === "down" && opts.result instanceof Error,
      }),
      httpBatchLink({
        url: `${apiBaseUrl}/trpc`,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}


