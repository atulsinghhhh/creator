import { randomBytes } from "node:crypto";
import type { CreditPack } from "./packs";

export interface PaymentOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  /** True when no real money moves — the UI must badge the checkout as test mode. */
  test: boolean;
}

export interface PaymentVerification {
  orderId: string;
  paymentId: string;
  signature?: string;
}

/**
 * Payment provider boundary — same swappable-adapter rule as the AI
 * providers: billing routes only call this interface; going live with real
 * Razorpay means a new adapter (order via Razorpay Orders API, verification
 * via webhook signature) + one config change. Nothing else moves.
 */
export interface PaymentProvider {
  name: string;
  createOrder(pack: CreditPack, userId: string): Promise<PaymentOrder>;
  verifyPayment(verification: PaymentVerification): Promise<boolean>;
}

/**
 * TEST-ONLY provider: fabricates order ids and accepts every payment.
 * Real Razorpay integration must verify the webhook signature server-side —
 * the client-confirm flow this enables is NOT acceptable with real money.
 */
export class DummyRazorpayProvider implements PaymentProvider {
  name = "razorpay_dummy";

  async createOrder(pack: CreditPack): Promise<PaymentOrder> {
    return {
      orderId: `order_dummy_${randomBytes(8).toString("hex")}`,
      amountPaise: pack.amountPaise,
      currency: pack.currency,
      test: true,
    };
  }

  async verifyPayment(verification: PaymentVerification): Promise<boolean> {
    return verification.orderId.startsWith("order_dummy_") && verification.paymentId.length > 0;
  }
}

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    const name = process.env.PAYMENT_PROVIDER ?? "razorpay_dummy";
    switch (name) {
      case "razorpay_dummy":
        provider = new DummyRazorpayProvider();
        break;
      default:
        throw new Error(`Unknown PAYMENT_PROVIDER: ${name}`);
    }
  }
  return provider;
}
