import z from 'zod';
import { router, protectedProcedure } from '../../trpc.js';
import { TRPCError } from '@trpc/server';
import {
  countHouseholdsByUserId,
  createHousehold,
  listHouseholdsByUserId,
} from './household-repo.js';

export const householdRouter = router({
  createHousehold: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name } = input;
      const { session } = ctx;

      const userId = session?.user.id;
      // For now we limit 5 households per user
      const { count } = await countHouseholdsByUserId({ userId: userId! });
      if (count >= 5) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User has reached the maximum number of households',
        });
      }

      const newHousehold = await createHousehold({ name, userId: userId! });
      return newHousehold;
    }),

  listHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const userId = session?.user.id;

    const { userHouseholds } = await listHouseholdsByUserId({ userId: userId! });
    return userHouseholds;
  }),

  countHouseholds: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const userId = session?.user.id;

    const { count } = await countHouseholdsByUserId({ userId: userId! });
    return count;
  }),
});
