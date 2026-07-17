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
  invalid_credentials: "Incorrect email or password.",
  account_locked:
    "Too many failed attempts — this account is temporarily locked. Try again in a few minutes.",
  rate_limited: "Too many attempts. Please wait a bit and try again.",
  invalid_input: "Enter a valid email and password.",
  invalid_csrf: "Your session expired — please try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data } = await postJson<{ error?: string }>("/api/auth/login", {
        email,
        password,
      });

      if (!ok) {
        setError(ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/workspace");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep making videos."
      footer={
        <>
          Don&rsquo;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-blurple hover:text-ink">
            Sign up
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full bg-blurple text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
