import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wallets, walletTransactions } from "@/lib/db/schema";
import type { CreditPack } from "./packs";

/**
 * Credits a wallet for a verified payment. Idempotent per paymentId
 * (webhook-replay guard): the same payment can never grant credits twice.
 */
export async function creditPurchase(params: {
  userId: string;
  pack: CreditPack;
  paymentId: string;
  orderId: string;
  provider: string;
}): Promise<{ balance: number; credited: boolean }> {
  return db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
    if (!wallet) throw new Error(`Wallet missing for user ${params.userId}`);

    const [existing] = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.walletId, wallet.id),
          eq(walletTransactions.reason, "credit_purchase"),
          sql`${walletTransactions.meta} ->> 'paymentId' = ${params.paymentId}`
        )
      );
    if (existing) return { balance: wallet.balance, credited: false };

    const [updated] = await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${params.pack.credits}`, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning({ balance: wallets.balance });

    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "credit",
      amount: params.pack.credits,
      reason: "credit_purchase",
      balanceAfter: updated.balance,
      meta: {
        paymentId: params.paymentId,
        orderId: params.orderId,
        packId: params.pack.id,
        provider: params.provider,
      },
    });

    return { balance: updated.balance, credited: true };
  });
}
