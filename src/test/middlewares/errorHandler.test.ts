import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import {
  registerErrorHandler,
  HttpError,
} from "../../middlewares/errorHandler.js";

async function buildApp() {
  const app = Fastify();
  app.get("/boom", async () => {
    throw new HttpError(404, "User not found", "NOT_FOUND");
  });
  app.get("/oops", async () => {
    throw new Error("unexpected");
  });
  registerErrorHandler(app);
  await app.ready();
  return app;
}

describe("errorHandler (RFC 7807)", () => {
  it("maps HttpError to problem+json with a machine-readable code", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json()).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      code: "NOT_FOUND",
      detail: "User not found",
    });
  });

  it("does not leak the message of an unexpected 500", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/oops" });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: "INTERNAL", status: 500 });
    expect(res.json().detail).toBeUndefined();
  });

  it("serves unmatched routes as problem+json, not Fastify's default", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/nope" });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json()).toMatchObject({
      type: "about:blank",
      status: 404,
      code: "ROUTE_NOT_FOUND",
    });
  });
});
