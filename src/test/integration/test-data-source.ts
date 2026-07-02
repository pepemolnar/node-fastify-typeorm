/// <reference types="vite/client" />
import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../../entities/user.entity.js";

// Vitest resolves this glob through its SWC transform (unlike TypeORM's own
// directory loader, which imports the raw .ts and chokes on the type-only
// `MigrationInterface` import). New migrations are picked up automatically —
// no manual list to keep in sync with src/migrations/.
const migrationModules = import.meta.glob("../../migrations/*.ts", {
  eager: true,
});
const migrations = Object.values(migrationModules).flatMap((m) =>
  Object.values(m as Record<string, unknown>),
) as (new () => object)[]; // migration classes; DataSource takes their constructors

export function makeTestDataSource(url: string) {
  return new DataSource({
    type: "postgres",
    url,
    entities: [User],
    migrations,
    synchronize: false, // prove the MIGRATIONS build the schema, like prod
  });
}
