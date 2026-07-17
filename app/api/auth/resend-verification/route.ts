import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { EMAIL_VERIFICATION_TTL_SECONDS, generateRawToken, hashToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/utilis/email";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuditEvent } from "@/lib/auth/audit";
import { verifyCsrf } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const rateLimit = await checkRateLimit({
    key: `resend-verification:user:${session.user.id}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const rawToken = generateRawToken();
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000),
  });

  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(user.email, verifyUrl);
  await logAuditEvent({ userId: user.id, eventType: "email_verification_sent", ip, userAgent });

  return NextResponse.json({ ok: true });
}
