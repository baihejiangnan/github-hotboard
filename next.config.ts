import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@rspack/core",
    "@rspack/binding-win32-x64-msvc"
  ],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: [
          "**/DumpStack.log.tmp",
          "**/pagefile.sys",
          "**/hiberfil.sys",
          "**/swapfile.sys",
          "**/System Volume Information/**"
        ]
      };
    }

    return config;
  }
};

export default nextConfig;
