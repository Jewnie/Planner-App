import { db } from "../../db.js";
import { eq } from "drizzle-orm";
import { integration, integrationStatuses, integrationTypes } from "../../db/integration-schema.js";

export const upsertIntegration = async (params:{
  accountId: string,
  type: typeof integrationTypes[number],
  status: typeof integrationStatuses[number],
}) =>{
  await db.insert(integration).values({
    accountId: params.accountId,
    type: params.type,
    status: params.status,
    
  }).onConflictDoUpdate({
    target: [integration.accountId, integration.type],
    set: {
      status: params.status,
      updatedAt: new Date(),
    },
  });
}

export const getIntegrations = async (params:{accountId: string}) => {
  return await db.select().from(integration).where(eq(integration.accountId, params.accountId));
}