import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../../../modules/users/infrastructure/user.entity.js";
import { ProjectEntity } from "../../../modules/projects/infrastructure/project.entity.js";
import { TaskEntity } from "../../../modules/projects/infrastructure/task.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User, ProjectEntity, TaskEntity],
  migrations: ["src/migrations/*.ts", "dist/migrations/*.js"],
  synchronize: false,
});
