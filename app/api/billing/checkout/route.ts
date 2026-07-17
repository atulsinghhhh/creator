import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/utilis/auth";
import { verifyCsrf } from "@/lib/auth/csrf";
import { getPack } from "@/lib/billing/packs";
import { getPaymentProvider } from "@/lib/billing/payment-provider";

const checkoutSchema = z.object({ packId: z.string().min(1) });

/** Creates a payment order for a credit pack. No wallet mutation happens here. */
export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const pack = getPack(parsed.data.packId);
  if (!pack) {
    return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
  }

  const order = await getPaymentProvider().createOrder(pack, session.user.id);

  return NextResponse.json({
    orderId: order.orderId,
    packId: pack.id,
    credits: pack.credits,
    amountPaise: order.amountPaise,
    currency: order.currency,
    test: order.test,
  });
}
