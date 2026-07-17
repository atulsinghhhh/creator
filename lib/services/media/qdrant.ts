import { EMBEDDING_DIM } from "./embeddings";

/**
 * Minimal Qdrant REST wrapper using plain fetch. (@qdrant/js-client-rest's
 * bundled undici dispatcher is incompatible with Node 26 — "invalid onError
 * method" — and this surface is tiny: collection, upsert, search, count.)
 */

export interface MediaPointPayload {
  file: string;
  url: string;
  durationSeconds: number;
  [key: string]: unknown;
}

export interface MediaSearchHit {
  id: string | number;
  score: number;
  payload: MediaPointPayload;
}

export class QdrantMediaIndex {
  constructor(
    private baseUrl: string,
    private collection: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /** Creates the collection if missing (cosine over CLIP's 512-d space). Safe to re-run. */
  async ensureCollection(): Promise<void> {
    const { result } = await this.request<{ result: { exists: boolean } }>(
      "GET",
      `/collections/${this.collection}/exists`
    );
    if (!result.exists) {
      await this.request("PUT", `/collections/${this.collection}`, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
    }
  }

  async upsert(points: { id: string; vector: number[]; payload: MediaPointPayload }[]): Promise<void> {
    await this.request("PUT", `/collections/${this.collection}/points?wait=true`, { points });
  }

  async search(vector: number[], limit: number): Promise<MediaSearchHit[]> {
    const { result } = await this.request<{ result: MediaSearchHit[] }>(
      "POST",
      `/collections/${this.collection}/points/search`,
      { vector, limit, with_payload: true }
    );
    return result;
  }

  async count(): Promise<number> {
    const { result } = await this.request<{ result: { count: number } }>(
      "POST",
      `/collections/${this.collection}/points/count`,
      { exact: true }
    );
    return result.count;
  }
}
