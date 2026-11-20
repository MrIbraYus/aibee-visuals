import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** Lets visitors add the site to their home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Aibee",
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080808",
    theme_color: "#080808",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Work", url: "/work" },
      { name: "Motion", url: "/motion" },
    ],
  };
}
