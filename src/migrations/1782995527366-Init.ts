import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1782995527366 implements MigrationInterface {
  name = "Init1782995527366";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passwordHash" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
