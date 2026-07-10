import type { Logger } from "pino";
import { Redis } from "ioredis";
import { env } from "./config/env.config.js";
import { durationToSeconds } from "./shared/infrastructure/duration.js";
import { AppDataSource } from "./shared/infrastructure/persistence/data-source.js";

import { TypeOrmUnitOfWork } from "./shared/infrastructure/persistence/unit-of-work.js";
import { RedisCache } from "./shared/infrastructure/cache/redis.cache.js";
import { BullMqJobQueue } from "./shared/infrastructure/jobs/bullmq.job-queue.js";
import { InMemoryEventBus } from "./shared/infrastructure/events/in-memory-event-bus.js";

import { UserRepository } from "./modules/users/infrastructure/user.repository.js";
import {
  ListUsers,
  ListUsersByCursor,
} from "./modules/users/application/list-users.js";
import { GetUser } from "./modules/users/application/get-user.js";
import { CreateUser } from "./modules/users/application/create-user.js";
import { CreateUsersBulk } from "./modules/users/application/create-users-bulk.js";
import { UpdateUser } from "./modules/users/application/update-user.js";
import { DeleteUser } from "./modules/users/application/delete.user.js";
import { UserController } from "./modules/users/interface/user.controller.js";
import { UserRoutes } from "./modules/users/interface/user.routes.js";

import { RegisterUser } from "./modules/auth/application/register-user.js";
import { VerifyCredentials } from "./modules/auth/application/verify-credentials.js";
import { RefreshTokenStore } from "./modules/auth/infrastructure/refresh-token-store.js";
import { AuthController } from "./modules/auth/interface/auth.controller.js";
import { AuthRoutes } from "./modules/auth/interface/auth.routes.js";

import { ProjectRepository } from "./modules/projects/infrastructure/project.repository.js";
import { CreateProject } from "./modules/projects/application/create-project.js";
import { GetProject } from "./modules/projects/application/get-project.js";
import { ListProjects } from "./modules/projects/application/list-projects.js";
import { AddTask } from "./modules/projects/application/add-task.js";
import { CompleteTask } from "./modules/projects/application/complete-task.js";
import { ArchiveProject } from "./modules/projects/application/archive-project.js";
import { ProjectController } from "./modules/projects/interface/project.controller.js";
import { ProjectRoutes } from "./modules/projects/interface/project.routes.js";

import { NotifierFactory } from "./modules/notifications/application/notifier.factory.js";
import { NotificationService } from "./modules/notifications/application/notification.service.js";
import { registerUserRegisteredHandlers } from "./modules/notifications/application/on-user-registered.js";
import { registerTaskCompletedHandlers } from "./modules/notifications/application/on-task-completed.js";
import { EmailNotifier } from "./modules/notifications/infrastructure/email.notifier.js";
import { SmsNotifier } from "./modules/notifications/infrastructure/sms.notifier.js";
import { LogNotifier } from "./modules/notifications/infrastructure/log.notifier.js";

export interface Container {
  checkReadiness: () => Promise<void>;
  userRoutes: UserRoutes;
  authRoutes: AuthRoutes;
  projectRoutes: ProjectRoutes;
}

export function createContainer(logger: Logger): Container {
  const checkReadiness = async () => {
    await AppDataSource.query("SELECT 1");
  };

  const redis = new Redis(env.REDIS_URL);
  const cache = new RedisCache(redis);
  const jobQueue = new BullMqJobQueue();
  const eventBus = new InMemoryEventBus(logger);
  const unitOfWork = new TypeOrmUnitOfWork(AppDataSource);

  const notifierFactory = new NotifierFactory([
    new EmailNotifier(),
    new SmsNotifier(),
    new LogNotifier(logger),
  ]);
  const notificationService = new NotificationService(notifierFactory, logger);

  const userRepository = new UserRepository(AppDataSource.manager);
  const userController = new UserController(
    new ListUsers(userRepository),
    new ListUsersByCursor(userRepository),
    new GetUser(userRepository, cache),
    new CreateUser(userRepository),
    new CreateUsersBulk(unitOfWork),
    new UpdateUser(userRepository, cache),
    new DeleteUser(userRepository, cache),
  );
  const userRoutes = new UserRoutes(userController, cache);

  const refreshStore = new RefreshTokenStore(
    redis,
    durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  );
  const authController = new AuthController(
    new RegisterUser(userRepository, eventBus),
    new VerifyCredentials(userRepository),
    refreshStore,
  );
  const authRoutes = new AuthRoutes(authController);

  const projectRepository = new ProjectRepository(AppDataSource.manager);
  const projectController = new ProjectController(
    new CreateProject(projectRepository),
    new GetProject(projectRepository),
    new ListProjects(projectRepository),
    new AddTask(projectRepository),
    new CompleteTask(projectRepository, eventBus),
    new ArchiveProject(projectRepository),
  );
  const projectRoutes = new ProjectRoutes(projectController);

  registerUserRegisteredHandlers(eventBus, {
    jobs: jobQueue,
    notifications: notificationService,
  });
  registerTaskCompletedHandlers(eventBus, {
    notifications: notificationService,
  });

  return { checkReadiness, userRoutes, authRoutes, projectRoutes };
}
