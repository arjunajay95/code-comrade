import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The posts list moved from /me/requests to /me/posts (D-40). The old path
  // keeps working with a permanent redirect.
  async redirects() {
    return [
      { source: "/me/requests", destination: "/me/posts", permanent: true },
    ];
  },
};

export default nextConfig;
