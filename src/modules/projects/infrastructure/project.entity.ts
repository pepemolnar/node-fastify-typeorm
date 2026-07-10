import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { TaskEntity } from "./task.entity.js";

@Entity("projects")
export class ProjectEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid")
  ownerId!: string;

  @Column()
  name!: string;

  @Column({ type: "varchar", default: "active" })
  status!: "active" | "archived";

  @Column({ type: "timestamptz", nullable: true })
  deadline!: Date | null;

  @OneToMany(() => TaskEntity, (task) => task.project, { cascade: true })
  tasks!: TaskEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
