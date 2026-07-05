import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The UA SDK (axios/borsh/anchor deps) breaks under server bundling —
  // load it from node_modules at runtime instead.
  serverExternalPackages: ["@particle-network/universal-account-sdk"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
