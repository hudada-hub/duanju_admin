// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'study-platform-1258739349.cos.ap-guangzhou.myqcloud.com',
            pathname: '/**',
          },{
            protocol: 'https',
            hostname: 'duanju-1258739349.cos.ap-guangzhou.myqcloud.com',
            pathname: '/**',
          }
        ],
      },
};

export default nextConfig;