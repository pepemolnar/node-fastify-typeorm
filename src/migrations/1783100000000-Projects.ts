import { MigrationInterface, QueryRunner } from "typeorm";

export class Projects1783100000000 implements MigrationInterface {
  name = "Projects1783100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL, "ownerId" uuid NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "deadline" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_projects_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL, "title" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'open', "projectId" uuid NOT NULL, CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_projectId" ON "tasks" ("projectId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_projectId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_tasks_projectId"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
