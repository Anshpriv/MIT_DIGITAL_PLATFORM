import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.45.69", "10.252.186.69", "localhost"],
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
