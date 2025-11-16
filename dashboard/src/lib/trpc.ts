import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
// Snapshot type is available at "@/types/app-router" if needed in the future.

// Fully erase types for the runtime tRPC react instance to avoid build-time coupling
// to server-only types during dashboard build on Vercel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (createTRPCReact as unknown as any)();

const apiBaseUrl = import.meta.env.VITE_API_URL || "";

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          (import.meta.env.MODE === "development" && typeof window !== "undefined") ||
          (opts.direction === "down" && opts.result instanceof Error),
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


