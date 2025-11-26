import { protectedProcedure, router } from "../../trpc.js";
import { getIntegrations } from "./integration-repo.js";


export const integrationRouter = router({
  getIntegrations: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await getIntegrations({accountId: ctx.accountId});

    return integrations;
  }),
});