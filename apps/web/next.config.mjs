import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nemesis/templates", "@nemesis/db"],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;