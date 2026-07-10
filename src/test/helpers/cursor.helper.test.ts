import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
} from "../../shared/infrastructure/pagination/cursor.js";

describe("cursor helper", () => {
  it("round-trips a cursor through encode/decode", () => {
    const cursor = {
      createdAt: new Date("2026-01-02T03:04:05.678Z"),
      id: "a1b2c3",
    };
    const decoded = decodeCursor(encodeCursor(cursor));
    expect(decoded.id).toBe(cursor.id);
    expect(decoded.createdAt.toISOString()).toBe(
      cursor.createdAt.toISOString(),
    );
  });

  it("produces an opaque token, not the raw values", () => {
    const token = encodeCursor({ createdAt: new Date(0), id: "abc" });
    expect(token).not.toContain("abc");
    expect(token).not.toMatch(/[{}"]/); // no JSON punctuation leaking through
  });

  it("rejects a tampered / non-base64 cursor with a 400", () => {
    expect(() => decodeCursor("not-a-real-cursor!!")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("rejects a cursor whose payload is missing fields", () => {
    const bad = Buffer.from(JSON.stringify({ id: "x" }), "utf8").toString(
      "base64url",
    );
    expect(() => decodeCursor(bad)).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});
