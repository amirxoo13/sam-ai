import { createServerFn } from "@tanstack/react-start";

export const getCrawlerStats = createServerFn({ method: "GET" }).handler(async () => {
  const { crawlerStats } = await import("./run.server");
  return crawlerStats();
});
