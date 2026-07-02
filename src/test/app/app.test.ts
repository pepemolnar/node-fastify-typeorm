import { describe, it, expect } from "vitest";
import { createApp } from "../../app.js";
import { UserRoutes } from "../../routes/user.routes.js";
import type { UserController } from "../../controllers/user.controller.js";
import { AuthRoutes } from "../../routes/auth.routes.js";
import type { AuthController } from "../../controllers/auth.controller.js";
import type { Container } from "../../container.js";

// The controller is never invoked while fetching the spec, so a stub is fine.
function buildContainer(): Container {
  return {
    userRoutes: new UserRoutes({} as UserController),
    authRoutes: new AuthRoutes({} as AuthController),
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
    expect(spec.paths).toHaveProperty("/users/{id}");

    await app.close();
  });
});
