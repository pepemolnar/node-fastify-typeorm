import { HttpError } from "../middlewares/errorHandler.js";

// The keyset a cursor pins to: the composite sort key of the last row on a page.
// createdAt orders the page; id breaks ties so paging can't skip or repeat rows
// that share a timestamp.
export type Cursor = { createdAt: Date; id: string };

// Cursors are opaque to clients — base64url over a tiny JSON payload. They carry
// no signature, so treat a decoded cursor as untrusted input, never as truth.
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
    throw new HttpError(400, "Invalid pagination cursor");
  }
}
