import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from "typeorm";
import { ProjectEntity } from "./project.entity.js";

@Entity("tasks")
export class TaskEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "varchar", default: "open" })
  status!: "open" | "done";

  @Index()
  @Column("uuid")
  projectId!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "projectId" })
  project!: Relation<ProjectEntity>;
}
