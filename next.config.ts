import type { NextConfig } from "next";

// GitHub Pages project site: https://vivo6810.github.io/Python-learn-2/
// If the repository is renamed (or a custom domain configured), update basePath.
const basePath = "/Python-learn-2";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["pv-65edc73db7e2-ae0e56a1-ce0e-49b8-b8dd-c23eb3a429a0.style.dev"],
  output: "export",
  basePath,
  trailingSlash: true,
};

export default nextConfig;
