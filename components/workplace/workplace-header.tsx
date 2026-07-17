import Link from "next/link";
import type { WorkplaceProfile } from "@/lib/workplace/queries";

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

export function WorkplaceHeader({ profile }: { profile: WorkplaceProfile }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/workplace" className="text-[17px] font-semibold tracking-tight text-ink">
          CreatorOS
        </Link>
        <div className="flex items-center gap-5">
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
              <a
                href="/api/auth/signout"
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
