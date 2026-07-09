import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { AuthController } from "../../controllers/auth.controller.js";
import { AuthRoutes } from "../../routes/auth.routes.js";
import { authPlugin } from "../../extras/auth/auth.plugin.js";
import { registerErrorHandler } from "../../middlewares/errorHandler.js";
import type { AuthService } from "../../services/auth.service.js";
import type {
  IRefreshTokenStore,
  RotateResult,
} from "../../extras/auth/refresh-token-store.js";

// In-memory store mirroring the Lua ROTATE semantics: one valid jti per family,
// compare-and-swap on rotate, family burned on reuse.
class FakeRefreshStore implements IRefreshTokenStore {
  private current = new Map<string, string>();
  async issue(family: string, jti: string): Promise<void> {
    this.current.set(family, jti);
  }
  async rotate(
    family: string,
    oldJti: string,
    newJti: string,
  ): Promise<RotateResult> {
    const cur = this.current.get(family);
    if (!cur) return "MISSING";
    if (cur !== oldJti) {
      this.current.delete(family);
      return "REUSE";
    }
    this.current.set(family, newJti);
    return "OK";
  }
  async revoke(family: string): Promise<void> {
    this.current.delete(family);
  }
}

// A real controller wired through a real JWT (so sign/verify/typ claims all run
// for real); only the credentials check and the Redis store are faked.
async function buildApp() {
  const authService = {
    verifyCredentials: vi.fn(async () => ({ id: "u1", role: "user" as const })),
  } as unknown as AuthService;
  const controller = new AuthController(authService, new FakeRefreshStore());

  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(authPlugin);
  await app.register(new AuthRoutes(controller).register, { prefix: "/auth" });
  registerErrorHandler(app);
  await app.ready();
  return app;
}

const login = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "ada@x.com", password: "password123" },
  });

const refresh = (
  app: Awaited<ReturnType<typeof buildApp>>,
  refreshToken: string,
) =>
  app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: { refreshToken },
  });

describe("AuthController refresh lifecycle", () => {
  it("login issues an access + refresh pair", async () => {
    const app = await buildApp();
    const res = await login(app);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.accessToken).not.toBe(body.refreshToken);
  });

  it("refresh rotates the token pair", async () => {
    const app = await buildApp();
    const first = (await login(app)).json();

    const res = await refresh(app, first.refreshToken);
    expect(res.statusCode).toBe(200);
    const rotated = res.json();
    // A brand-new refresh token — the old one is now spent.
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
  });

  it("reusing an already-rotated refresh token is rejected and burns the family", async () => {
    const app = await buildApp();
    const first = (await login(app)).json();
    const second = (await refresh(app, first.refreshToken)).json();

    // Replaying the spent token → 401 (reuse detected).
    expect((await refresh(app, first.refreshToken)).statusCode).toBe(401);
    // And the family is now revoked, so even the valid newer token fails.
    expect((await refresh(app, second.refreshToken)).statusCode).toBe(401);
  });

  it("an access token cannot be used at /auth/refresh", async () => {
    const app = await buildApp();
    const { accessToken } = (await login(app)).json();
    expect((await refresh(app, accessToken)).statusCode).toBe(401);
  });

  it("logout revokes the family so its refresh token stops working", async () => {
    const app = await buildApp();
    const { refreshToken } = (await login(app)).json();

    const out = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken },
    });
    expect(out.statusCode).toBe(204);
    expect((await refresh(app, refreshToken)).statusCode).toBe(401);
  });

  it("logout is idempotent for a garbage token", async () => {
    const app = await buildApp();
    const out = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: "not-a-real-token" },
    });
    expect(out.statusCode).toBe(204);
  });
});
