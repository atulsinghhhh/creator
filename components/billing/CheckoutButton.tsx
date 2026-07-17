"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/utilis/auth-client";

interface Order {
  orderId: string;
  packId: string;
  credits: number;
  amountPaise: number;
  currency: string;
  test: boolean;
}

function formatAmount(paise: number, currency: string): string {
  return `${currency === "INR" ? "₹" : ""}${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Dummy-Razorpay checkout: creates an order, then shows an in-app TEST MODE
 * panel (deliberately our own UI, not an imitation of Razorpay's) whose
 * "Simulate payment" stands in for the real payment + webhook. Swapping in
 * real Razorpay replaces this with their SDK modal + a server webhook.
 */
export function CheckoutButton({ packId, packName }: { packId: string; packName: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [phase, setPhase] = useState<"idle" | "creating" | "paying" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPhase("creating");
    setError(null);
    const { ok, data } = await postJson<Order & { error?: string }>("/api/billing/checkout", {
      packId,
    });
    if (!ok) {
      setError("Couldn't start checkout. Please try again.");
      setPhase("idle");
      return;
    }
    setOrder(data);
    setPhase("idle");
  }

  async function simulatePayment() {
    if (!order) return;
    setPhase("paying");
    setError(null);
    const paymentId = `pay_dummy_${Date.now()}`;
    const { ok } = await postJson("/api/billing/confirm", {
      orderId: order.orderId,
      packId: order.packId,
      paymentId,
    });
    if (!ok) {
      setError("Payment confirmation failed. Please try again.");
      setPhase("idle");
      return;
    }
    setPhase("done");
    router.refresh();
  }

  if (order) {
    return (
      <div className="rounded-xl border border-line bg-fog p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Razorpay checkout</span>
          <span className="rounded-full bg-[#fff8e1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a6d00]">
            Test mode
          </span>
        </div>
        <p className="mt-2 text-sm text-body">
          {order.credits} credits · {formatAmount(order.amountPaise, order.currency)}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted">{order.orderId}</p>

        {phase === "done" ? (
          <p className="mt-3 rounded-lg bg-[#effdf4] px-3 py-2 text-center text-sm font-semibold text-[#0e6245]">
            Credits added ✓
          </p>
        ) : (
          <button
            onClick={simulatePayment}
            disabled={phase === "paying"}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-blurple text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink disabled:opacity-60"
          >
            {phase === "paying" ? "Processing…" : "Simulate successful payment"}
          </button>
        )}
        {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={startCheckout}
        disabled={phase === "creating"}
        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-blurple text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink disabled:opacity-60"
      >
        {phase === "creating" ? "Starting…" : `Buy ${packName}`}
      </button>
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
