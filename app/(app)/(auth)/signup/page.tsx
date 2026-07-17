"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { ErrorBanner } from "@/components/auth/ErrorBanner";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { postJson } from "@/lib/utilis/auth-client";

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: "An account with this email already exists.",
  invalid_input: "Check your name, email, and password (8+ characters) and try again.",
  rate_limited: "Too many attempts. Please wait a bit and try again.",
  invalid_csrf: "Your session expired — please try again.",
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data } = await postJson<{ error?: string }>("/api/auth/register", {
        name,
        email,
        password,
      });

      if (!ok) {
        setError(ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/workplace");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start turning prompts into publishable videos."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blurple hover:text-ink">
            Sign in
          </Link>
        </>
      }
    >
      {error && <ErrorBanner message={error} />}

      <GoogleButton />

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[13px] font-medium text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={name}
          onChange={setName}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters."
          value={password}
          onChange={setPassword}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full bg-blurple text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] leading-relaxed text-muted">
        By continuing, you get a free plan with 20 credits to start — no card required.
      </p>
    </AuthShell>
  );
}
