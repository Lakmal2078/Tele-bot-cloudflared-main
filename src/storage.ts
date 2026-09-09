/**
 * Unified R2 storage layer.
 *
 * Priority 1: native Cloudflare R2 binding (env.CHAT_MEDIA) - works inside a
 *             Worker with zero credentials and zero extra bundle weight.
 * Priority 2: S3 API via @aws-sdk/client-s3 - used only when running outside
 *             Cloudflare (Node / Termux / VPS) where no binding exists.
 *
 * The AWS SDK is imported lazily so that a Worker deployment never has to
 * evaluate it (it is Node-oriented and adds ~1 MB to the bundle).
 */
import type { Env, R2BucketBinding, R2ObjectSummary } from "./types";

let cachedClient: any = null;
let lastAccountId = "";

export function hasR2Binding(env: Env): boolean {
  return Boolean(env.CHAT_MEDIA && typeof env.CHAT_MEDIA.put === "function");
}

export function getBucket(env: Env): R2BucketBinding | null {
  return hasR2Binding(env) ? (env.CHAT_MEDIA as R2BucketBinding) : null;
}

export function hasS3Credentials(env: Env): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME
  );
}

export function isR2Configured(env: Env): boolean {
  return hasR2Binding(env) || hasS3Credentials(env);
}

export function getBucketName(env: Env): string {
  return env.R2_BUCKET_NAME || env.R2_BUCKET_NAME_BINDING || "chat-media";
}

async function getS3Client(env: Env): Promise<any | null> {
  if (!hasS3Credentials(env)) return null;
  if (cachedClient && lastAccountId === env.R2_ACCOUNT_ID) return cachedClient;

  const { S3Client } = await import("@aws-sdk/client-s3");
  lastAccountId = env.R2_ACCOUNT_ID!;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

/** Upload an object. Returns true on success. */
export async function putObject(
  env: Env,
  key: string,
  body: ArrayBuffer | Uint8Array | string,
  contentType: string
): Promise<boolean> {
  const bucket = getBucket(env);
  if (bucket) {
    await bucket.put(key, body as any, {
      httpMetadata: { contentType },
    });
    return true;
  }

  const client = await getS3Client(env);
  if (!client) return false;

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: key,
      Body: body instanceof ArrayBuffer ? new Uint8Array(body) : (body as any),
      ContentType: contentType,
    })
  );
  return true;
}

/** List objects under a prefix, paginating transparently. */
export async function listObjects(
  env: Env,
  prefix: string,
  cursor?: string
): Promise<{ objects: R2ObjectSummary[]; cursor?: string; truncated: boolean }> {
  const bucket = getBucket(env);
  if (bucket) {
    const res = await bucket.list({ prefix, limit: 1000, cursor });
    return {
      objects: (res.objects || []).map((o: any) => ({
        key: o.key,
        size: o.size || 0,
        uploaded: o.uploaded ? new Date(o.uploaded) : undefined,
      })),
      cursor: res.truncated ? res.cursor : undefined,
      truncated: Boolean(res.truncated),
    };
  }

  const client = await getS3Client(env);
  if (!client) return { objects: [], truncated: false };

  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const res: any = await client.send(
    new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME!,
      Prefix: prefix,
      ContinuationToken: cursor,
      MaxKeys: 1000,
    })
  );
  return {
    objects: (res.Contents || []).map((o: any) => ({
      key: o.Key as string,
      size: o.Size || 0,
      uploaded: o.LastModified ? new Date(o.LastModified) : undefined,
    })),
    cursor: res.NextContinuationToken,
    truncated: Boolean(res.IsTruncated),
  };
}

/** Delete a batch of keys. Returns the keys that failed. */
export async function deleteObjects(env: Env, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];

  const bucket = getBucket(env);
  if (bucket) {
    const failed: string[] = [];
    // The binding accepts up to 1000 keys per call.
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      try {
        await bucket.delete(chunk);
      } catch {
        for (const key of chunk) {
          try {
            await bucket.delete(key);
          } catch {
            failed.push(key);
          }
        }
      }
    }
    return failed;
  }

  const client = await getS3Client(env);
  if (!client) return keys;

  const { DeleteObjectsCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const failed: string[] = [];
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = keys.slice(i, i + 500);
    try {
      const res: any = await client.send(
        new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME!,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        })
      );
      for (const err of res?.Errors || []) {
        if (err?.Key) failed.push(err.Key);
      }
    } catch {
      for (const key of chunk) {
        try {
          await client.send(
            new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: key })
          );
        } catch {
          failed.push(key);
        }
      }
    }
  }
  return failed;
}

/** Build a public URL for a stored object. */
export function buildPublicUrl(env: Env, key: string): string {
  if (env.R2_PUBLIC_DOMAIN && env.R2_PUBLIC_DOMAIN.trim() !== "") {
    const domain = env.R2_PUBLIC_DOMAIN.trim().replace(/\/$/, "");
    return `${domain}/${key}`;
  }
  if (env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME) {
    return `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }
  return `r2://${getBucketName(env)}/${key}`;
}
