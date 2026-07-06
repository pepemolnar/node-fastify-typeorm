import "reflect-metadata";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../entities/user.entity.js";
import { hashPassword } from "../helpers/password.helper.js";
import {
  makeUser,
  makeUsers,
  DEFAULT_PASSWORD,
} from "../helpers/user.factory.js";

const USER_COUNT = 25;
const SOFT_DELETED_COUNT = 2;

// A seed row is a factory-built DTO plus the two persistence-only attributes
// the public CreateUserDto path can't set: role and the soft-delete flag.
type SeedSpec = {
  dto: ReturnType<typeof makeUser>;
  role: "user" | "admin";
  isDeleted: boolean;
};

function buildSpecs(): SeedSpec[] {
  return [
    // One admin with a stable, memorable login.
    {
      dto: makeUser({ name: "Admin User", email: "admin@example.com" }),
      role: "admin",
      isDeleted: false,
    },
    // A batch of regular, active users.
    ...makeUsers(USER_COUNT).map((dto): SeedSpec => ({
      dto,
      role: "user",
      isDeleted: false,
    })),
    // A couple of soft-deleted rows so list/pagination queries have realistic
    // hidden records to filter out.
    ...makeUsers(SOFT_DELETED_COUNT).map((dto): SeedSpec => ({
      dto,
      role: "user",
      isDeleted: true,
    })),
  ];
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production");
  }

  const force = process.argv.includes("--force");

  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    const existing = await repo.count();
    if (existing > 0 && !force) {
      console.log(
        `Users table already has ${existing} rows — skipping. Pass --force to reseed.`,
      );
      return;
    }

    const specs = buildSpecs();

    // One transaction: the whole dataset lands or nothing does.
    await AppDataSource.transaction(async (m) => {
      const txRepo = m.getRepository(User);
      if (force) {
        // Clear first so --force is idempotent rather than additive.
        await txRepo.createQueryBuilder().delete().from(User).execute();
      }
      for (const { dto, role, isDeleted } of specs) {
        await txRepo.save(
          txRepo.create({
            name: dto.name,
            email: dto.email,
            passwordHash: await hashPassword(dto.password),
            role,
            isDeleted,
          }),
        );
      }
    });

    console.log(
      `Seeded ${specs.length} users (1 admin, ${USER_COUNT} active, ${SOFT_DELETED_COUNT} soft-deleted).`,
    );
    console.log(`Admin login: admin@example.com`);
    console.log(`All accounts use password: ${DEFAULT_PASSWORD}`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
