import type { Container } from "../../container.js";
import { UserRoutes } from "../../routes/user.routes.js";
import type { UserController } from "../../controllers/user.controller.js";
import { AuthRoutes } from "../../routes/auth.routes.js";
import type { AuthController } from "../../controllers/auth.controller.js";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

function buildContainer(ready: boolean): Container {
  return {
    userRoutes: new UserRoutes({} as UserController),
    authRoutes: new AuthRoutes({} as AuthController),
    checkReadiness: ready
      ? async () => {}
      : async () => {
          throw new Error("db down");
        },
  };
}

describe("health & readiness", () => {
  it("GET /health is always 200 (liveness)", async () => {
    const app = await createApp(buildContainer(false)); // even when DB is down
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("GET /ready returns 200 when the probe succeeds", async () => {
    const app = await createApp(buildContainer(true));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("GET /ready returns 503 when the probe throws", async () => {
    const app = await createApp(buildContainer(false));
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});
