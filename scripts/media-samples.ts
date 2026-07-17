import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

/**
 * Generates synthetic labeled test clips into the media library so the
 * pipeline is verifiable without downloading stock footage. These prove
 * plumbing, not semantic relevance — drop real MP4s into the same folder and
 * re-run `npm run media:ingest` for meaningful matches.
 *
 * Each clip is a distinct 5s 1080x1920 visual (gradients/test patterns with
 * different palettes) named after a common stock-footage concept.
 */
const SAMPLES: { name: string; filter: string }[] = [
  { name: "ocean-waves-blue", filter: "color=c=0x1a6ee0:s=1080x1920,geq=r='26':g='110+40*sin(2*PI*Y/300+T*2)':b='224'" },
  { name: "sunset-warm-gradient", filter: "color=c=0xff7733:s=1080x1920,geq=r='255':g='119-60*Y/H':b='51+80*Y/H'" },
  { name: "forest-green-nature", filter: "color=c=0x1f7a33:s=1080x1920,geq=r='31':g='122+50*sin(2*PI*X/240+T)':b='51'" },
  { name: "city-night-lights", filter: "testsrc2=s=1080x1920,hue=h=240:s=2" },
  { name: "office-desk-work", filter: "testsrc2=s=1080x1920,hue=h=40:s=1" },
  { name: "people-talking-meeting", filter: "testsrc2=s=1080x1920,hue=h=120:s=2" },
  { name: "coffee-morning-kitchen", filter: "color=c=0x6b4423:s=1080x1920,geq=r='107+40*sin(T*3)':g='68':b='35'" },
  { name: "fitness-gym-exercise", filter: "testsrc2=s=1080x1920,hue=h=0:s=3" },
  { name: "technology-abstract-digital", filter: "mandelbrot=s=1080x1920:rate=30" },
  { name: "sky-clouds-calm", filter: "color=c=0x87ceeb:s=1080x1920,geq=r='135+60*sin(2*PI*X/500+T)':g='206':b='235'" },
];

async function main() {
  const dir = process.env.MEDIA_LIBRARY_DIR ?? "./media-library";
  await mkdir(dir, { recursive: true });

  for (const sample of SAMPLES) {
    const out = `${dir}/${sample.name}.mp4`;
    await execFileAsync(ffmpegPath as unknown as string, [
      "-y",
      "-f", "lavfi",
      "-i", sample.filter,
      "-t", "5",
      "-r", "30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "veryfast",
      out,
    ]);
    console.log(`generated ${out}`);
  }
  console.log(`\n${SAMPLES.length} sample clips in ${dir} — now run: npm run media:ingest`);
}

main().catch((err) => {
  console.error("Sample generation failed:", err);
  process.exit(1);
});
