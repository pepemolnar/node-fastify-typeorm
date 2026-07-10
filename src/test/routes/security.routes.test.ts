import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { UserRoutes } from "../../modules/users/interface/user.routes.js";
import type { UserController } from "../../modules/users/interface/user.controller.js";
import { AuthRoutes } from "../../modules/auth/interface/auth.routes.js";
import type { AuthController } from "../../modules/auth/interface/auth.controller.js";
import { ProjectRoutes } from "../../modules/projects/interface/project.routes.js";
import type { ProjectController } from "../../modules/projects/interface/project.controller.js";
import type { Container } from "../../container.js";
import { InMemoryCache } from "../../shared/infrastructure/cache/in-memory.cache.js";

// No controller is invoked for these cross-cutting checks, so stubs are fine.
function buildContainer(): Container {
  return {
    userRoutes: new UserRoutes({} as UserController, new InMemoryCache()),
    authRoutes: new AuthRoutes({} as AuthController),
    projectRoutes: new ProjectRoutes({} as ProjectController),
    checkReadiness: async () => {},
  };
}

describe("security hardening", () => {
  it("sets helmet security headers on responses", async () => {
    const app = await createApp(buildContainer());
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();

    await app.close();
  });

  it("applies a Swagger-compatible CSP (inline assets allowed)", async () => {
    const app = await createApp(buildContainer());
    const res = await app.inject({ method: "GET", url: "/health" });

    // The tailored policy must keep 'unsafe-inline' so /docs can render.
    expect(res.headers["content-security-policy"]).toContain("'unsafe-inline'");

    await app.close();
  });

  it("echoes the configured CORS origin", async () => {
    const app = await createApp(buildContainer());
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://example.com" },
    });

    expect(res.headers["access-control-allow-origin"]).toBe("*");

    await app.close();
  });

  it("still serves the OpenAPI docs with helmet active", async () => {
    const app = await createApp(buildContainer());
    const res = await app.inject({ method: "GET", url: "/docs/json" });

    expect(res.statusCode).toBe(200);

    await app.close();
  });
});
