const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

export function relativeTime(date: Date, from: Date = new Date()): string {
  let delta = (date.getTime() - from.getTime()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(delta) < division.amount) {
      return rtf.format(Math.round(delta), division.unit);
    }
    delta /= division.amount;
  }
  return rtf.format(Math.round(delta), "years");
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram Reels",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
