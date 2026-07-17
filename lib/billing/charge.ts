import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { generations, projects, wallets, walletTransactions } from "@/lib/db/schema";
import { GENERATION_COST_CREDITS } from "./packs";

/**
 * Debits the cost of one video for a completed generation (CLAUDE.md Billing:
 * balance is checked at start but only charged on completion — a failed
 * generation never costs a credit). Idempotent via generations.creditsCharged:
 * the flag is flipped with a guarded UPDATE inside the same transaction as
 * the wallet debit, so retries/replays can't double-charge.
 *
 * Called from the orchestrator's success path only. A charge failure is
 * logged but never fails the generation — the video exists; billing
 * reconciliation is our problem, not the user's.
 */
export async function chargeGeneration(generationId: string): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Guarded flip: only proceeds if this transaction is the one that
      // transitions creditsCharged false → true.
      const charged = await tx
        .update(generations)
        .set({ creditsCharged: true })
        .where(and(eq(generations.id, generationId), eq(generations.creditsCharged, false)))
        .returning({ projectId: generations.projectId });
      if (charged.length === 0) return; // already charged — no-op

      const [project] = await tx
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, charged[0].projectId));
      if (!project) throw new Error(`Project missing for generation ${generationId}`);

      const [wallet] = await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${GENERATION_COST_CREDITS}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, project.userId))
        .returning({ id: wallets.id, balance: wallets.balance });
      if (!wallet) throw new Error(`Wallet missing for user ${project.userId}`);

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: "debit",
        amount: GENERATION_COST_CREDITS,
        reason: "generation",
        balanceAfter: wallet.balance,
        reference_id: generationId,
      });
    });
  } catch (err) {
    console.error(`[billing] chargeGeneration(${generationId}) failed:`, err);
  }
}
