/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@vardi/ui",
    "@vardi/config",
    "@vardi/schemas",
    "@vardi/db",
    "@vardi/risk",
    "@vardi/export",
    "@vardi/checklists",
  ],
};

export default nextConfig;
