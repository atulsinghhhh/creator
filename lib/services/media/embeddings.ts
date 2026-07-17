import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  type PreTrainedTokenizer,
  type Processor,
} from "@huggingface/transformers";

/**
 * CLIP embeddings, in-process via ONNX (transformers.js). ~150MB of model
 * files auto-download to the HF cache on first use. Text and images map into
 * the same 512-d space, so a scene's visualQuery can be cosine-matched
 * against clip frames. Swapping to true Python OpenCLIP later only changes
 * this module — callers just see embedText/embedImage.
 */
const MODEL_ID = "Xenova/clip-vit-base-patch32";
export const EMBEDDING_DIM = 512;

let tokenizer: PreTrainedTokenizer | undefined;
let textModel: CLIPTextModelWithProjection | undefined;
let processor: Processor | undefined;
let visionModel: CLIPVisionModelWithProjection | undefined;

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  tokenizer ??= await AutoTokenizer.from_pretrained(MODEL_ID);
  textModel ??= await CLIPTextModelWithProjection.from_pretrained(MODEL_ID);

  const inputs = tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  return normalize(Array.from(text_embeds.data as Float32Array));
}

export async function embedImage(filePath: string): Promise<number[]> {
  processor ??= await AutoProcessor.from_pretrained(MODEL_ID);
  visionModel ??= await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID);

  const image = await RawImage.read(filePath);
  const inputs = await processor(image);
  const { image_embeds } = await visionModel(inputs);
  return normalize(Array.from(image_embeds.data as Float32Array));
}

/** Element-wise mean of vectors, re-normalized — used to pool a clip's frame embeddings. */
export function meanVector(vectors: number[][]): number[] {
  const sum = new Array(vectors[0].length).fill(0);
  for (const vec of vectors) for (let i = 0; i < vec.length; i++) sum[i] += vec[i];
  return normalize(sum.map((v) => v / vectors.length));
}
