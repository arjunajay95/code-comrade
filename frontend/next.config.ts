import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP for browsers without it (D-40). The photo is dark and
    // smooth, so quality 65 is visually the same as the default 75 (PSNR above
    // 42 dB on both crops) at a third fewer bytes. Next only serves a quality
    // listed here, so both are allowed.
    formats: ["image/avif", "image/webp"],
    qualities: [65, 75],
  },
  // The posts list moved from /me/requests to /me/posts (D-40). The old path
  // keeps working with a permanent redirect.
  async redirects() {
    return [
      { source: "/me/requests", destination: "/me/posts", permanent: true },
    ];
  },
};

export default nextConfig;
