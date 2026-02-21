import type { NextConfig } from "next";

function getHostname(value?: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const r2PublicHostname = getHostname(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
const r2FallbackHostname = getHostname(process.env.R2_PUBLIC_URL);

const imageHosts = Array.from(
  new Set([r2PublicHostname, r2FallbackHostname].filter(Boolean) as string[]),
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
};

export default nextConfig;
