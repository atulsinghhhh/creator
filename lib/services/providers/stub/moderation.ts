import type { ModerationResult, ModerationService } from "@/lib/services/types";

/** Stub — always allows. Swap for a real moderation provider (e.g. an LLM or moderation API) later. */
export class StubModeration implements ModerationService {
  async moderate(): Promise<ModerationResult> {
    return { allowed: true, costUsd: 0 };
  }
}
