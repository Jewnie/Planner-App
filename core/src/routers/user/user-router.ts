import { protectedProcedure, router } from "../../trpc.js";
import { getUserAccount } from "./user-repo.js";

export const userRouter = router({
  getUser: protectedProcedure.query(async({ ctx }) => {

    const userAccount = await getUserAccount(ctx.session!.user.id);

    return userAccount;

}),
});