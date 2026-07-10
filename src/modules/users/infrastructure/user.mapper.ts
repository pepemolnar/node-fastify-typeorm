import { User } from "../domain/user.js";
import { User as UserEntity } from "./user.entity.js";

export class UserMapper {
  static toEntity(user: User): UserEntity {
    const row = new UserEntity();
    row.id = user.id;
    row.name = user.name;
    row.email = user.email;
    row.role = user.role;
    row.passwordHash = user.passwordHash;

    row.createdAt = user.createdAt;
    row.updatedAt = user.updatedAt;
    return row;
  }

  static toDomain(row: UserEntity): User {
    return User.reconstitute({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
