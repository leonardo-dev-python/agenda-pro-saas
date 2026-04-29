import { createJsonAppRepository } from "./json-app-repository.js";
import { createPrismaAppRepository } from "./prisma-app-repository.js";

export function createAppRepository(options) {
  const provider = (options.provider || "json").toLowerCase();

  if (provider === "prisma") {
    return createPrismaAppRepository(options);
  }

  return createJsonAppRepository(options.gateway);
}
