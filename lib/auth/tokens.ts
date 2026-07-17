import { randomBytes, randomUUID, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema";

export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_COOKIE_NAME = "refresh_token";

export const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/** A random, URL-safe opaque token to hand to the client (email link, cookie, etc). */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way digest stored server-side — the raw token itself is never persisted. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

interface IssueRefreshTokenParams {
  userId: string;
  family?: string;
  createdByIp?: string | null;
  userAgent?: string | null;
}

export async function issueRefreshToken({
  userId,
  family,
  createdByIp,
  userAgent,
}: IssueRefreshTokenParams) {
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    family: family ?? randomUUID(),
    expiresAt,
    createdByIp: createdByIp ?? null,
    userAgent: userAgent ?? null,
  });

  return { rawToken, expiresAt };
}

type RotateResult =
  | { status: "rotated"; rawToken: string; expiresAt: Date; userId: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "reused"; userId: string };

/**
 * Validates and rotates a refresh token. If a token that was already rotated
 * (i.e. previously used) is presented again, the whole rotation family is
 * revoked and "reused" is returned — the standard signal for token theft.
 */
export async function rotateRefreshToken(
  rawToken: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<RotateResult> {
  const tokenHash = hashToken(rawToken);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash));

  if (!existing) return { status: "invalid" };

  if (existing.revokedAt) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.family, existing.family));
    return { status: "reused", userId: existing.userId };
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    return { status: "expired" };
  }

  const { rawToken: newRawToken, expiresAt } = await issueRefreshToken({
    userId: existing.userId,
    family: existing.family,
    createdByIp: meta.ip,
    userAgent: meta.userAgent,
  });

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), replacedByTokenHash: hashToken(newRawToken) })
    .where(eq(refreshTokens.tokenHash, tokenHash));

  return { status: "rotated", rawToken: newRawToken, expiresAt, userId: existing.userId };
}

export async function revokeRefreshToken(rawToken: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, hashToken(rawToken)));
}

export async function revokeAllRefreshTokensForUser(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}
