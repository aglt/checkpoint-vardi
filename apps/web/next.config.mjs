/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["http://127.0.0.1:3001"],
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: [
    "@vardi/ui",
    "@vardi/config",
    "@vardi/schemas",
    "@vardi/db",
    "@vardi/risk",
    "@vardi/export",
    "@vardi/checklists",
  ],
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    return config;
  },
};

export default nextConfig;
