import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { GENERATION_COST_CREDITS } from "./packs";

/** Fast-read credit balance (wallets.balance is the source of truth — never sum transactions). */
export async function getBalance(userId: string): Promise<number> {
  const [wallet] = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId));
  return wallet?.balance ?? 0;
}

/** Gate check before starting a generation (balance ≥ cost of one video). */
export async function hasCredit(userId: string): Promise<boolean> {
  return (await getBalance(userId)) >= GENERATION_COST_CREDITS;
}
