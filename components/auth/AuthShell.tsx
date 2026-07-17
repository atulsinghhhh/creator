import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-fog">
      {/* soft Stripe-gradient glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[440px] w-[980px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "linear-gradient(100deg, #ffd48a 0%, #ff7eb9 30%, #b56dff 55%, #6f8bff 78%, #7bd8ff 100%)",
        }}
      />
      <header className="relative flex h-16 items-center px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink"
        >
          <span className="inline-block size-2.5 rounded-full bg-blurple" aria-hidden />
          CreatorOS
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="shadow-stripe rounded-2xl border border-line bg-white p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-[15px] text-body">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}
