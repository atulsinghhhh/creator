import Link from "next/link";
import type { WorkplaceProfile } from "@/lib/workplace/queries";
import { SignOutButton } from "./sign-out-button";

function Avatar({ profile }: { profile: WorkplaceProfile }) {
  if (profile.image) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar hosts (Google) vary; remote patterns not configured yet
    return (
      <img
        src={profile.image}
        alt=""
        className="size-8 rounded-full border border-line"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-blurple text-[13px] font-semibold text-white">
      {profile.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function WorkplaceHeader({
  profile,
  credits,
}: {
  profile: WorkplaceProfile;
  credits?: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href="/workplace"
          className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink"
        >
          <span className="inline-block size-2.5 rounded-full bg-blurple" aria-hidden />
          CreatorOS
        </Link>
        <div className="flex items-center gap-5">
          {credits !== undefined && (
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-full bg-blurple/10 px-3 py-1 text-[13px] font-semibold text-blurple transition-colors hover:bg-blurple hover:text-white"
            >
              {credits} {credits === 1 ? "credit" : "credits"}
            </Link>
          )}
          <Link
            href="/projects/new"
            className="hidden text-sm font-semibold text-ink/80 transition-colors hover:text-ink sm:block"
          >
            New project
          </Link>
          <div className="flex items-center gap-2.5">
            <Avatar profile={profile} />
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-semibold text-ink">{profile.name}</p>
              <SignOutButton className="text-xs text-muted transition-colors hover:text-ink" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
