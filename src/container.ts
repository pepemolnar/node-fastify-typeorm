import type { Logger } from "pino";
import { AppDataSource } from "./db/data-source.js";
import { UserModel } from "./models/user.model.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { UserRoutes } from "./routes/user.routes.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AuthRoutes } from "./routes/auth.routes.js";
import { NotifierFactory } from "./notifications/notifier.js";
import { EmailNotifier } from "./notifications/email.notifier.js";
import { SmsNotifier } from "./notifications/sms.notifier.js";
import { LogNotifier } from "./notifications/log.notifier.js";
import { NotificationService } from "./services/notification.service.js";
import { TypeOrmUnitOfWork } from "./db/unit-of-work.js";

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
    new LogNotifier(),
  ]);
  const notificationService = new NotificationService(notifierFactory, logger);

  const userRepository = new UserModel(AppDataSource.manager);
  const unitOfWork = new TypeOrmUnitOfWork(AppDataSource);
  const userService = new UserService(userRepository, unitOfWork);
  const userController = new UserController(userService);
  const userRoutes = new UserRoutes(userController);

  const authService = new AuthService(userRepository, notificationService);
  const authController = new AuthController(authService);
  const authRoutes = new AuthRoutes(authController);

  return { checkReadiness, userRoutes, authRoutes };
}
