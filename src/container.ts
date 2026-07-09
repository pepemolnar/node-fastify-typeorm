import type { Logger } from "pino";
import { AppDataSource } from "./extras/data-source.js";
import { UserModel } from "./models/user.model.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { UserRoutes } from "./routes/user.routes.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AuthRoutes } from "./routes/auth.routes.js";
import { NotifierFactory } from "./extras/notifications/notifier.js";
import { EmailNotifier } from "./extras/notifications/email.notifier.js";
import { SmsNotifier } from "./extras/notifications/sms.notifier.js";
import { LogNotifier } from "./extras/notifications/log.notifier.js";
import { NotificationService } from "./services/notification.service.js";
import { TypeOrmUnitOfWork } from "./extras/unit-of-work.js";
import { RedisCache } from "./extras/adapters/redis.adapter.js";
import { Redis } from "ioredis";
import { env } from "./config/env.config.js";
import { BullMqJobQueue } from "./extras/adapters/bullmq.adapter.js";
import { InMemoryEventBus } from "./extras/events/event-bus.js";
import { SEND_EMAIL, SendEmailJob } from "./types/job.types.js";
import { RefreshTokenStore } from "./extras/auth/refresh-token-store.js";
import { durationToSeconds } from "./helpers/duration.helper.js";

export interface Container {
  checkReadiness: () => Promise<void>;
  userRoutes: UserRoutes;
  authRoutes: AuthRoutes;
}

export function createContainer(logger: Logger): Container {
  const checkReadiness = async () => {
    await AppDataSource.query("SELECT 1");
  };
  const notifierFactory = new NotifierFactory([
    new EmailNotifier(),
    new SmsNotifier(),
    new LogNotifier(logger),
  ]);
  const notificationService = new NotificationService(notifierFactory, logger);
  const redis = new Redis(env.REDIS_URL);
  const cache = new RedisCache(redis);
  const jobQueue = new BullMqJobQueue();
  const eventBus = new InMemoryEventBus(logger);
  const refreshStore = new RefreshTokenStore(
    redis,
    durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  );

  const userRepository = new UserModel(AppDataSource.manager);
  const unitOfWork = new TypeOrmUnitOfWork(AppDataSource);
  const userService = new UserService(userRepository, unitOfWork, cache);
  const userController = new UserController(userService);
  const userRoutes = new UserRoutes(userController, cache);

  const authService = new AuthService(userRepository, eventBus);
  const authController = new AuthController(authService, refreshStore);
  const authRoutes = new AuthRoutes(authController);

  eventBus.subscribe("UserRegistered", async (e) => {
    await jobQueue.enqueue(SEND_EMAIL, {
      to: e.email,
      template: "welcome",
      context: { name: e.name },
    } satisfies SendEmailJob);
  });
  eventBus.subscribe("UserRegistered", async (e) => {
    await notificationService.notify("log", e.email, "Welcome!");
  });

  return { checkReadiness, userRoutes, authRoutes };
}
