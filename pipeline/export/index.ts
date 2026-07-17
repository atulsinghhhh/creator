import { getProviderConfig } from "@/lib/config/providers";
import { getExporterService } from "@/lib/services";
import type { ExportOutput, PipelineStage } from "../types";

/** Thin wrapper over the configured ExporterService. Final step — produces the downloadable video URL. */
export const exportStage: PipelineStage<"export", ExportOutput> = {
  step: "export",
  async run(state) {
    const render = state.results.render;
    if (!render) throw new Error("export stage requires render output");

    const { videoUrl, costUsd } = await getExporterService().export({
      draftVideoPath: render.draftVideoPath,
      platform: state.platform,
      generationId: state.generationId,
    });

    return {
      output: { videoUrl },
      cost: costUsd,
      provider: getProviderConfig().EXPORTER_PROVIDER,
    };
  },
};
