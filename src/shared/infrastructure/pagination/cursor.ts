import { HttpError } from "../../domain/errors/http-error.js";

export type Cursor = { createdAt: Date; id: string };

export function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify({
    createdAt: cursor.createdAt.toISOString(),
    id: cursor.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { id?: unknown }).id !== "string" ||
      typeof (parsed as { createdAt?: unknown }).createdAt !== "string"
    ) {
      throw new Error("malformed cursor payload");
    }

    const { createdAt, id } = parsed as { createdAt: string; id: string };
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) throw new Error("invalid cursor date");

    return { createdAt: date, id };
  } catch {
    throw new HttpError(400, "Invalid pagination cursor", "INVALID_CURSOR");
  }
}
