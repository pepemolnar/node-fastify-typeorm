import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: ["src/migrations/*.ts", "dist/migrations/*.js"],
  synchronize: false, // use migrations, like Prisma
});