import Link from "next/link";
import { getRecentActivity, type ActivityKind } from "@/lib/workplace/queries";
import { relativeTime } from "@/lib/workplace/format";
import { Icon, icons } from "./icons";
import { SectionError } from "./section-error";

const KIND_META: Record<
  ActivityKind,
  { icon: string; verb: string; iconClass: string }
> = {
  project_created: {
    icon: icons.folder,
    verb: "Project created",
    iconClass: "bg-blurple/10 text-blurple",
  },
  video_generated: {
    icon: icons.film,
    verb: "Video generated",
    iconClass: "bg-[#effdf4] text-[#0e6245]",
  },
  video_downloaded: {
    icon: icons.download,
    verb: "Video downloaded",
    iconClass: "bg-[#e8f7ff] text-[#0570de]",
  },
};

export async function RecentActivity({ userId }: { userId: string }) {
  let items;
  try {
    items = await getRecentActivity(userId);
  } catch {
    return <SectionError label="your activity" />;
  }

  return (
    <div className="shadow-stripe-sm rounded-xl border border-line bg-white p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon d={icons.clock} className="size-4 text-blurple" />
        Recent activity
      </h2>

      {items.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-body">
          Nothing here yet — create your first project and your activity will
          show up here.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item, i) => {
            const meta = KIND_META[item.kind];
            return (
              <li key={`${item.kind}-${item.projectId}-${i}`}>
                <Link
                  href={`/projects/${item.projectId}`}
                  className="group flex items-center gap-3"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}
                  >
                    <Icon d={meta.icon} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] text-ink">
                      <span className="font-semibold">{meta.verb}</span>
                      {" · "}
                      <span className="text-body group-hover:text-blurple">
                        {item.title}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{relativeTime(item.at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
