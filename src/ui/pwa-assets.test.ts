import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA assets", () => {
  it("defines installable app metadata", () => {
    const manifest = JSON.parse(
      readFileSync(resolve("public/manifest.webmanifest"), "utf8"),
    ) as {
      name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src?: string; purpose?: string }>;
    };

    expect(manifest.name).toBe("Boggle Party Prototype");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons?.some((icon) => icon.src === "/icons/icon.svg")).toBe(true);
    expect(manifest.icons?.some((icon) => icon.purpose?.includes("maskable"))).toBe(true);
  });

  it("keeps realtime room routes out of the offline cache strategy", () => {
    const serviceWorker = readFileSync(resolve("public/service-worker.js"), "utf8");

    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('url.pathname.startsWith("/ws/")');
    expect(serviceWorker).toContain("CACHE_NAME");
    expect(serviceWorker).toContain("APP_SHELL");
  });
});
