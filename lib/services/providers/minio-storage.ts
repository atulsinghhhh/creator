import { Client } from "minio";
import type { ProviderConfig } from "@/lib/config/providers";
import type { StorageService, UploadResult } from "@/lib/services/types";

/**
 * MinIO adapter for StorageService. Dev buckets are public-read so uploaded
 * assets get stable direct URLs (`MINIO_PUBLIC_URL/bucket/key`) that can be
 * persisted in the DB — no presigning, no expiry.
 */
export class MinIOStorageService implements StorageService {
  private client: Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor(config: ProviderConfig) {
    this.client = new Client({
      endPoint: config.MINIO_ENDPOINT,
      port: config.MINIO_PORT,
      useSSL: config.MINIO_USE_SSL,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
    });
    this.bucket = config.MINIO_BUCKET;
    this.publicBaseUrl = config.MINIO_PUBLIC_URL.replace(/\/$/, "");
  }

  /** Creates the bucket and applies a public-read policy. Call once at worker boot; safe to re-run. */
  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) await this.client.makeBucket(this.bucket);

    await this.client.setBucketPolicy(
      this.bucket,
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      })
    );
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.putObject(this.bucket, key, body, body.length, {
      "Content-Type": contentType,
    });
    return { key, url: this.getPublicUrl(key) };
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
