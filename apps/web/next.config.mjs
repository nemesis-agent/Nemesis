/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nemesis/templates", "@nemesis/db"],
};

export default nextConfig;
