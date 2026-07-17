import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/utilis/auth";
import { verifyCsrf } from "@/lib/auth/csrf";
import { getPack } from "@/lib/billing/packs";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { creditPurchase } from "@/lib/billing/purchase";

const confirmSchema = z.object({
  orderId: z.string().min(1),
  packId: z.string().min(1),
  paymentId: z.string().min(1),
});

/**
 * Confirms a (dummy) payment and credits the wallet. TEST-MODE SHORTCUT:
 * with real Razorpay this endpoint must be replaced by a signature-verified
 * webhook (CLAUDE.md Billing: "only the webhook is trusted" — never credit
 * from a client-initiated call). Acceptable here only because no real money
 * exists behind razorpay_dummy.
 */
export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { orderId, packId, paymentId } = parsed.data;

  const pack = getPack(packId);
  if (!pack) {
    return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  if (!(await provider.verifyPayment({ orderId, paymentId }))) {
    return NextResponse.json({ error: "payment_not_verified" }, { status: 400 });
  }

  const result = await creditPurchase({
    userId: session.user.id,
    pack,
    paymentId,
    orderId,
    provider: provider.name,
  });

  return NextResponse.json({ balance: result.balance, credited: result.credited });
}
