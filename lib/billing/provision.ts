import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingTiers, subscriptions, wallets, walletTransactions } from "@/lib/db/schema";

const FREE_PLAN_CODE = "free" as const;
const SIGNUP_BONUS_CREDITS = 20;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Runs inside an existing transaction (e.g. alongside the user INSERT itself,
// so a failure here rolls back user creation too — no orphaned accounts).

export async function provisionNewUserTx(tx: Tx, userId: string) {
  const [freeTier] = await tx.select().from(pricingTiers).where(eq(pricingTiers.code, FREE_PLAN_CODE));
  if (!freeTier) {
    throw new Error(`"${FREE_PLAN_CODE}" pricing tier is not seeded — run \`npm run db:seed\` first`);
  }

  const [wallet] = await tx.insert(wallets).values({ userId, balance: 0 }).returning();

  await tx.insert(subscriptions).values({
    userId,
    pricingTierId: freeTier.id,
    status: "active",
    provider: "none",
    providerSubscriptionId: `free_${userId}`,
    providerCustomerId: `free_${userId}`,
  });

  const balanceAfter = wallet.balance + SIGNUP_BONUS_CREDITS;
  await tx.update(wallets).set({ balance: balanceAfter }).where(eq(wallets.id, wallet.id));

  await tx.insert(walletTransactions).values({
    walletId: wallet.id,
    type: "credit",
    amount: SIGNUP_BONUS_CREDITS,
    reason: "signup_bonus",
    balanceAfter,
  });
}

/** Standalone entry point (its own transaction) — used for OAuth first-time sign-ins. */
export async function provisionNewUser(userId: string) {
  await db.transaction((tx) => provisionNewUserTx(tx, userId));
}
