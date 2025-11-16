import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../trpc.js";
import { auth } from "../../auth.js";
import { google } from 'googleapis';
import { fromNodeHeaders } from "better-auth/node";
import { getGoogleAccountForUser } from "../user/user-repo.js";
import { TRPCError } from "@trpc/server";
export const appRouter = router({
  health: publicProcedure.query(() => {
    return { ok: true, time: new Date().toISOString() };
  }),
  me: protectedProcedure.query(({ ctx }) => {
    return { user: ctx.session?.user ?? null };
  }),
  echo: publicProcedure.input(z.object({ message: z.string() })).query(({ input }) => {
    return { message: input.message };
  }),



  fetchEvents: protectedProcedure.query(async ({ ctx }) => {

    const userAccount = await getGoogleAccountForUser(ctx.session!.user.id);
    if (!userAccount) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No Google account linked" });
    }

    // Log for debugging
    console.log("User account scope:", userAccount.scope);
    console.log("User account refresh token exists:", !!userAccount.refreshToken);

    const {accessToken} = await auth.api.getAccessToken({
        body: {
          providerId: "google",
          accountId: userAccount.id,
          userId: userAccount.userId,
        },
        headers: fromNodeHeaders(ctx.req.headers),
      });

    // Build an OAuth2 client and set the access token so googleapis uses OAuth instead of API key
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2.setCredentials({
      access_token: accessToken,
      // include refresh token so the client can auto-refresh if needed
      refresh_token: userAccount.refreshToken ?? undefined,
    });

    // Try to use the API - if it fails with insufficient permissions, we know the scope is missing
    try {
      const calendarClient = google.calendar({version: 'v3', auth: oauth2});
      const events = await calendarClient.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
      });
      return events.data;
    } catch (error: unknown) {
      const err = error as { code?: number | string; message?: string };
      if (err.code === 403 || err.message?.includes("Insufficient Permission")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Missing Google Calendar scope. Please reconnect Google with calendar access. (DB scope: ${userAccount.scope || "none"})`,
        });
      }
      throw error;
    }
  }),


});

export type AppRouter = typeof appRouter;


