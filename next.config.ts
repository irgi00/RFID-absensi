import type { NextConfig } from "next";

const nextBuildDistDir = process.env.NEXT_BUILD_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  ...(nextBuildDistDir ? { distDir: nextBuildDistDir } : {}),
};

export default nextConfig;
