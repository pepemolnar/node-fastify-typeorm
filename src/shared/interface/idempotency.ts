import type { FastifyReply, FastifyRequest } from "fastify";
import type { Cache } from "../infrastructure/cache/cache.port.js";

const PENDING_TTL = 60;
const DONE_TTL = 24 * 60 * 60;
const cacheKey = (k: string) => `idem:${k}`;

// What we store under an idempotency key: a claim that's either still running
// or finished (with the response to replay).
type IdemRecord =
  | { state: "pending" }
  | { state: "done"; status: number; contentType?: string; body: unknown };

export function idempotency(cache: Cache) {
  // Requests we've already answered from here (a replay or a 409) — so the
  // onSend `remember` hook doesn't try to persist those as the "real" response.
  const shortCircuited = new WeakSet<FastifyRequest>();

  // preHandler: claim the key; replay or reject if it's already taken.
  const replay = async (req: FastifyRequest, reply: FastifyReply) => {
    const idemKey = req.headers["idempotency-key"];
    if (typeof idemKey !== "string") return; // header is optional

    // Atomically claim it. The first caller wins and falls through to the
    // handler; everyone else hits one of the branches below.
    const claimed = await cache.setIfAbsent<IdemRecord>(
      cacheKey(idemKey),
      { state: "pending" },
      PENDING_TTL,
    );
    if (claimed) return;

    const saved = await cache.get<IdemRecord>(cacheKey(idemKey));
    if (saved?.state === "done") {
      shortCircuited.add(req);
      if (saved.contentType) reply.header("content-type", saved.contentType);
      return reply.status(saved.status).send(saved.body); // replay
    }

    // Claimed but not finished → a concurrent request is still in flight.
    shortCircuited.add(req);
    return reply.status(409).send({
      error: "A request with this Idempotency-Key is already being processed",
    });
  };

  // onSend: persist the first response so a later retry can replay it.
  const remember = async (
    req: FastifyRequest,
    reply: FastifyReply,
    payload: unknown,
  ) => {
    const idemKey = req.headers["idempotency-key"];
    if (typeof idemKey !== "string" || shortCircuited.has(req)) return payload;

    if (reply.statusCode < 400) {
      await cache.set<IdemRecord>(
        cacheKey(idemKey),
        {
          state: "done",
          status: reply.statusCode,
          contentType: reply.getHeader("content-type")?.toString(),
          body: payload,
        },
        DONE_TTL,
      );
    } else {
      // The handler failed — release the claim so the client can retry.
      await cache.del(cacheKey(idemKey));
    }
    return payload;
  };

  return { replay, remember };
}
