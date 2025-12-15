import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db.js';
import { householdMembers, households } from '../../db/household-schema.js';

export const createHousehold = async (params: { name: string; userId: string }) => {
  const { name, userId } = params;

  const newHousehold = await db.transaction(async (tx) => {
    const newHousehold = await tx.insert(households).values({ name, createdBy: userId }).returning({
      id: households.id,
      name: households.name,
      createdBy: households.createdBy,
    });

    await tx.insert(householdMembers).values({
      householdId: newHousehold[0].id,
      userId: userId,
      role: 'owner',
    });
    return newHousehold[0];
  });
  if (!newHousehold) {
    throw new Error('Failed to create household');
  }
  return newHousehold;
};

export const countHouseholdsByUserId = async (params: { userId: string }) => {
  const { userId } = params;

  const householdMemberships = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId));

  return { count: householdMemberships.length };
};

export const listHouseholdsByUserId = async (params: { userId: string }) => {
  const { userId } = params;
  const userHouseholdMemberships = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId));

  const householdIds = userHouseholdMemberships.map((membership) => membership.householdId);

  // If no memberships, return empty array
  if (householdIds.length === 0) {
    return { userHouseholds: [] };
  }

  const userHouseholds = await db
    .select({
      id: households.id,
      name: households.name,
      createdAt: households.createdAt,
      createdBy: households.createdBy,
    })
    .from(households)
    .where(inArray(households.id, householdIds));

  return { userHouseholds };
};
