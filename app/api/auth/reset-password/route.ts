import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/argon2";
import { hashToken, revokeAllRefreshTokensForUser } from "@/lib/auth/tokens";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";
import { verifyCsrf } from "@/lib/auth/csrf";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const rateLimit = await checkRateLimit({ key: `reset-password:ip:${ip}`, limit: 10, windowSeconds: 15 * 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)));

  if (!tokenRow || tokenRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.update(users).set({ passwordHash }).where(eq(users.id, tokenRow.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenRow.id));

  // A leaked/rotated password shouldn't leave old sessions valid anywhere.
  await revokeAllRefreshTokensForUser(tokenRow.userId);

  await logAuditEvent({ userId: tokenRow.userId, eventType: "password_reset_completed", ip, userAgent });

  return NextResponse.json({ ok: true });
}
