import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Lets phones on the same Wi-Fi load the dev server (http://<this-PC's-IP>:3000).
  allowedDevOrigins: ["192.168.100.16", "*.local"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
