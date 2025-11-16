import { eq } from "drizzle-orm";
import { db } from "../../db.js";
import { account } from "../../db/schema.js";
export const getUserAccount = async (userId: string) => {

    // const userData = await db.select().from(user).where(eq(user.id, userId));
    const userAccount = await db.select().from(account).where(eq(account.userId, userId));

    return userAccount[0];
}

export const getGoogleAccountForUser = async (userId: string) => {
    const rows = await db
        .select()
        .from(account)
        .where(eq(account.userId, userId))
        .then(a => a.filter(row => row.providerId === "google"));
    return rows[0];
}