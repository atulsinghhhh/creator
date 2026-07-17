import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { logAuditEvent } from "@/lib/auth/audit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { verifyCsrf } from "@/lib/auth/csrf";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.usedAt)));

  if (!tokenRow || tokenRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, tokenRow.userId));
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenRow.id));

  await logAuditEvent({
    userId: tokenRow.userId,
    eventType: "email_verified",
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
  });

  return NextResponse.json({ ok: true });
}
