import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const MAX_FAILED_ATTEMPTS = 5;
const BASE_LOCKOUT_MINUTES = 1;
const MAX_LOCKOUT_MINUTES = 24 * 60;

/** Exponential backoff by lockout cycle: 1, 2, 4, 8, ... minutes, capped at 24h. */
function lockoutDurationMinutes(lockoutCount: number): number {
  return Math.min(BASE_LOCKOUT_MINUTES * 2 ** lockoutCount, MAX_LOCKOUT_MINUTES);
}

export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

/**
 * Call after a failed password check. Increments the failure counter and,
 * once it crosses the threshold, locks the account for an increasing delay.
 */
export async function recordFailedLogin(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;

  const failedLoginAttempts = user.failedLoginAttempts + 1;

  if (failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutCount = user.lockoutCount + 1;
    const lockedUntil = new Date(Date.now() + lockoutDurationMinutes(lockoutCount) * 60 * 1000);

    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockoutCount, lockedUntil })
      .where(eq(users.id, userId));

    return { locked: true as const, lockedUntil };
  }

  await db.update(users).set({ failedLoginAttempts }).where(eq(users.id, userId));
  return { locked: false as const };
}

export async function recordSuccessfulLogin(userId: string) {
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockoutCount: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}
