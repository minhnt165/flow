import type { MetadataRoute } from "next";
import { t } from "@/messages/vi";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t.app.name,
    short_name: t.app.name,
    description: t.app.tagline,
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E0F14",
    theme_color: "#0E0F14",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      {
        src: "/icons/monochrome-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    shortcuts: [
      {
        name: t.expenses.add,
        url: "/expenses?add=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: t.nav.countdowns, url: "/countdowns" },
    ],
  };
}
