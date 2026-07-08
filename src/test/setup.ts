import "reflect-metadata";

// env.config.ts requires DATABASE_URL at import time. Tests never connect,
// but booting the real app (e.g. the OpenAPI test) parses env, so give it a value.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.POSTGRES_USER ??= "practice";
process.env.POSTGRES_PASSWORD ??= "practice";
process.env.POSTGRES_DB ??= "practice";
process.env.JWT_SECRET ??= "test-jwt-secret-at-least-32-characters-long";
process.env.REDIS_URL ??= "redis://localhost:6379";
