import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Turbo Timmy Writer",
    short_name: "Timmy Writer",
    description: "A focused, AI-assisted writing studio for Tim Benniks.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#171717",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
