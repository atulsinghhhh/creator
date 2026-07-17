import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/**
 * Runs pipeline stages standalone, in order, up to the requested step —
 * no queue, no DB writes from the orchestrator, just stage contracts.
 *
 * Usage:
 *   npx tsx scripts/run-stage.ts <planner|script|voice|captions|media|render> \
 *     [--prompt "..."] [--platform instagram|tiktok|youtube_shorts]
 *
 * Upstream stages run first because each stage only consumes the documented
 * outputs of the ones before it (e.g. `script` needs `planner`'s brief).
 */
async function main() {
  // Deferred import so dotenv runs before any module reads process.env.
  const { pipelineGraph } = await import("@/pipeline/registry");
  const { PIPELINE_STEPS } = await import("@/pipeline/types");
  type PipelineState = import("@/pipeline/types").PipelineState;

  const [target, ...rest] = process.argv.slice(2);
  if (!PIPELINE_STEPS.includes(target as (typeof PIPELINE_STEPS)[number])) {
    console.error(`Usage: npx tsx scripts/run-stage.ts <${PIPELINE_STEPS.join("|")}> [--prompt "..."] [--platform ...]`);
    process.exit(1);
  }

  const argValue = (flag: string) => {
    const i = rest.indexOf(flag);
    return i >= 0 ? rest[i + 1] : undefined;
  };

  let state: PipelineState = {
    generationId: `standalone-${Date.now()}`,
    projectId: "standalone",
    prompt: argValue("--prompt") ?? "3 tips to stay productive while working from home",
    platform: argValue("--platform") ?? "instagram",
    results: {},
  };

  // PIPELINE_STEPS is topologically sorted, so running sequentially satisfies
  // every stage's dependencies (parallelism is a worker concern, not a
  // debugging-tool concern).
  const stagesInOrder = PIPELINE_STEPS.map(
    (step) => pipelineGraph.find((node) => node.stage.step === step)!.stage
  );

  for (const stage of stagesInOrder) {
    const started = Date.now();
    const { output, cost, provider, model } = await stage.run(state);
    state = { ...state, results: { ...state.results, [stage.step]: output } };

    console.log(
      `\n=== ${stage.step} — ${Date.now() - started}ms, $${cost.toFixed(4)}` +
        (provider ? `, ${provider}${model ? `/${model}` : ""}` : ", mock") +
        ` ===`
    );
    console.log(JSON.stringify(output, null, 2));

    if (stage.step === target) break;
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Stage run failed:", err);
  process.exit(1);
});
