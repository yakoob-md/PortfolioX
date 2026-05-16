import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/ai/:path*',
        destination: 'http://localhost:8000/api/ai/:path*',
      },
    ];
  },
};

export default nextConfig;
