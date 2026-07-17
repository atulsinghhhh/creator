import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { PASSWORD_RESET_TTL_SECONDS, generateRawToken, hashToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/utilis/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";
import { verifyCsrf } from "@/lib/auth/csrf";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const ipLimit = await checkRateLimit({ key: `forgot-password:ip:${ip}`, limit: 10, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Always returns the same generic response — never reveals whether the email exists.
  const genericResponse = () => NextResponse.json({ ok: true });

  const emailLimit = await checkRateLimit({ key: `forgot-password:email:${email}`, limit: 3, windowSeconds: 60 * 60 });
  if (!emailLimit.allowed) return genericResponse();

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (user) {
    const rawToken = generateRawToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
    });

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
    await logAuditEvent({ userId: user.id, eventType: "password_reset_requested", ip, userAgent });
  }

  return genericResponse();
}
