import { describe, it, expect } from "vitest";
import { createApp } from "../../app.js";
import { UserRoutes } from "../../modules/users/interface/user.routes.js";
import type { UserController } from "../../modules/users/interface/user.controller.js";
import { AuthRoutes } from "../../modules/auth/interface/auth.routes.js";
import type { AuthController } from "../../modules/auth/interface/auth.controller.js";
import { ProjectRoutes } from "../../modules/projects/interface/project.routes.js";
import type { ProjectController } from "../../modules/projects/interface/project.controller.js";
import type { Container } from "../../container.js";
import { InMemoryCache } from "../../shared/infrastructure/cache/in-memory.cache.js";

// The controller is never invoked while fetching the spec, so a stub is fine.
function buildContainer(): Container {
  return {
    userRoutes: new UserRoutes({} as UserController, new InMemoryCache()),
    authRoutes: new AuthRoutes({} as AuthController),
    projectRoutes: new ProjectRoutes({} as ProjectController),
    checkReadiness: async () => {},
  };
}

describe("OpenAPI docs", () => {
  it("serves an OpenAPI spec generated from the route schemas", async () => {
    const app = await createApp(buildContainer());
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/docs/json" });

    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toBeDefined();
    expect(spec.paths).toHaveProperty("/v1/users/{id}");

    await app.close();
  });
});
