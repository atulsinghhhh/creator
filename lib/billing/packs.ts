/**
 * V0 credit packs — one-time purchases (no subscriptions in V0 billing).
 * Amounts are in paise (Razorpay's smallest INR unit).
 */

/** How many credits one successful video generation consumes. */
export const GENERATION_COST_CREDITS = 10;

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  amountPaise: number;
  currency: "INR";
  featured?: boolean;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "starter", name: "Starter", credits: 20, amountPaise: 19900, currency: "INR" },
  { id: "creator", name: "Creator", credits: 60, amountPaise: 49900, currency: "INR", featured: true },
  { id: "pro", name: "Pro", credits: 150, amountPaise: 99900, currency: "INR" },
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
