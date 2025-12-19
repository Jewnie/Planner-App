import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db.js';
import { householdMembers, households } from '../../db/household-schema.js';
import { user } from '../../db/auth-schema.js';

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

  const userHouseholds = await db
    .select({
      id: households.id,
      name: households.name,
      createdAt: households.createdAt,
      createdBy: households.createdBy,
      role: householdMembers.role,
    })
    .from(households)
    .leftJoin(householdMembers, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId));

  const householdIds = userHouseholds.map((household) => household.id);

  const householdMemberships = await db
    .select({
      userId: householdMembers.userId,
      householdId: householdMembers.householdId,
      userName: user.name,
    })
    .from(householdMembers)
    .leftJoin(user, eq(householdMembers.userId, user.id))
    .where(inArray(householdMembers.householdId, householdIds));

  const userHouseholfdWithMembersMapped = userHouseholds.map((household) => {
    const members = householdMemberships.filter(
      (membership) => membership.householdId === household.id,
    );
    return {
      ...household,
      members,
    };
  });

  return { userHouseholds: userHouseholfdWithMembersMapped };
};

export const createHouseholdInvitation = async (params: {
  householdId: string;
  userId: string;
  email: string;
}) => {
  const { householdId, userId, email } = params;

  // const invitation = await db
  //   .insert(householdInvitations)
  //   .values({ householdId, userId, email })
  //   .returning({
  //     id: householdInvitations.id,
  //   });
  return;
};
