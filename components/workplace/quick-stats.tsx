import { getQuickStats } from "@/lib/workplace/queries";
import { Icon, icons } from "./icons";
import { SectionError } from "./section-error";

export async function QuickStats({ userId }: { userId: string }) {
  let stats;
  try {
    stats = await getQuickStats(userId);
  } catch {
    return <SectionError label="your stats" />;
  }

  const tiles = [
    { icon: icons.folder, label: "Projects", value: String(stats.totalProjects) },
    { icon: icons.film, label: "Videos generated", value: String(stats.totalVideos) },
    { icon: icons.download, label: "Downloads", value: String(stats.totalDownloads) },
    {
      icon: icons.target,
      label: "Success rate",
      value: stats.successRate === null ? "—" : `${stats.successRate}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="shadow-stripe-sm rounded-xl border border-line bg-white p-5"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-blurple/10 text-blurple">
            <Icon d={t.icon} className="size-4" />
          </span>
          <p className="mt-3.5 text-2xl font-semibold tracking-tight text-ink">
            {t.value}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
