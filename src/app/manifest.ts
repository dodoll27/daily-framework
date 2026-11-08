import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Framework",
    short_name: "Daily",
    description: "The plan is the default. Schedule first, time not completion.",
    start_url: "/",
    display: "standalone",
    background_color: "#efe9dd",
    theme_color: "#efe9dd",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
