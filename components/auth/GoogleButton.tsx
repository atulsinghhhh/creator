"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleLogo } from "./icons";

export function GoogleButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white text-[15px] font-semibold text-ink transition-colors duration-200 hover:bg-fog disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleLogo className="size-4.5" />
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
