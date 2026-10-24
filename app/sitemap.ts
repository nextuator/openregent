import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: APP_URL, changeFrequency: "weekly", priority: 1 }];
}
