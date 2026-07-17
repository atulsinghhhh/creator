import Link from "next/link";
import { getRecentProjects, type RecentProject } from "@/lib/workplace/queries";
import { formatDuration, platformLabel, relativeTime } from "@/lib/workplace/format";
import { Icon, icons } from "./icons";
import { SectionError } from "./section-error";

const STATUS_STYLES: Record<RecentProject["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-fog text-muted" },
  in_progress: { label: "Processing", className: "bg-blurple/10 text-blurple" },
  completed: { label: "Ready", className: "bg-[#effdf4] text-[#0e6245]" },
};

function ProjectCard({ project }: { project: RecentProject }) {
  const status = STATUS_STYLES[project.status];
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group shadow-stripe-sm overflow-hidden rounded-xl border border-line bg-white transition-shadow duration-300 hover:shadow-stripe"
    >
      <div className="relative aspect-video bg-gradient-to-br from-[#635bff] via-[#5b6bff] to-[#00a2ff]">
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage host (MinIO) not in image config yet
          <img
            src={project.thumbnailUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/25 backdrop-blur transition-transform group-hover:scale-110">
              <Icon d={icons.play} filled className="ml-0.5 size-4 text-white" />
            </span>
          </div>
        )}
        {project.duration !== null && (
          <span className="absolute bottom-2 right-2 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {formatDuration(project.duration)}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold text-ink group-hover:text-blurple">
            {project.title}
          </h3>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">{platformLabel(project.platform)}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}
          >
            {status.label}
          </span>
          <span className="text-xs text-muted">
            {relativeTime(project.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-blurple/10 text-blurple">
        <Icon d={icons.sparkles} filled className="size-5" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">No projects yet</h3>
      <p className="mt-1 max-w-xs text-sm text-body">
        Your first video is one sentence away. Describe it and let CreatorOS do
        the rest.
      </p>
      <Link
        href="/projects/new"
        className="mt-5 inline-flex h-10 items-center gap-1 rounded-full bg-blurple px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink"
      >
        Create your first project
        <Icon d={icons.chevronRight} className="size-3" strokeWidth={3} />
      </Link>
    </div>
  );
}

export async function RecentProjects({ userId }: { userId: string }) {
  let projects;
  try {
    projects = await getRecentProjects(userId);
  } catch {
    return <SectionError label="your projects" />;
  }

  if (projects.length === 0) return <EmptyProjects />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
