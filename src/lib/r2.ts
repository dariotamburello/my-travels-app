import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function normalizeS3Endpoint(rawEndpoint: string): string {
  const value = rawEndpoint.trim();
  if (!value) {
    return value;
  }

  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

function resolvePublicBaseUrl(
  rawPublicUrl: string,
  endpoint: string,
  bucketName: string,
): string {
  if (rawPublicUrl) {
    return rawPublicUrl.replace(/\/+$/, "");
  }

  if (!endpoint) {
    return "";
  }

  try {
    const parsed = new URL(endpoint);
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length > 0) {
      return `${parsed.protocol}//${parsed.host}/${pathParts[0]}`;
    }

    if (bucketName) {
      return `${parsed.protocol}//${parsed.host}/${bucketName}`;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    const sanitized = endpoint.replace(/\/+$/, "");
    return bucketName ? `${sanitized}/${bucketName}` : sanitized;
  }
}

function resolvePublicUrlFromEnv(endpoint: string, bucketName: string): string {
  const nextPublicUrl = readEnv("NEXT_PUBLIC_R2_PUBLIC_URL");
  if (nextPublicUrl) {
    return nextPublicUrl;
  }

  const privatePublicUrl = readEnv("R2_PUBLIC_URL");
  if (privatePublicUrl) {
    return privatePublicUrl;
  }

  return resolvePublicBaseUrl("", endpoint, bucketName);
}

export function getR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const endpoint = readEnv("R2_ENDPOINT");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = readEnv("R2_BUCKET_NAME");
  const publicUrl = resolvePublicUrlFromEnv(endpoint, bucketName);

  const normalizedEndpoint = normalizeS3Endpoint(endpoint);
  const resolvedPublicUrl = resolvePublicBaseUrl(
    publicUrl,
    endpoint,
    bucketName,
  );

  const missing = [
    ["R2_ENDPOINT", normalizedEndpoint],
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_BUCKET_NAME", bucketName],
    ["R2_PUBLIC_URL o endpoint+bucket válidos", resolvedPublicUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno de R2: ${missing.join(", ")}`);
  }

  cachedConfig = {
    endpoint: normalizedEndpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: resolvedPublicUrl,
  };

  return cachedConfig;
}

export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export function buildR2PublicUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  return `${getR2Config().publicUrl}/${normalizedKey}`;
}

export function resolveR2KeyFromStoredPath(pathOrUrl: string): string | null {
  const value = String(pathOrUrl ?? "").trim();
  if (!value) {
    return null;
  }

  const stripToPhotos = (pathname: string): string | null => {
    const normalized = pathname.replace(/^\/+/, "");
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith("photos/")) {
      return normalized;
    }

    const photoSegmentIndex = normalized.indexOf("/photos/");
    if (photoSegmentIndex >= 0) {
      return normalized.slice(photoSegmentIndex + 1);
    }

    return null;
  };

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      return stripToPhotos(url.pathname);
    } catch {
      return null;
    }
  }

  return stripToPhotos(value);
}
