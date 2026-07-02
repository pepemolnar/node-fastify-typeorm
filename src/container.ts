import { AppDataSource } from "./db/data-source.js";
import { UserModel } from "./models/user.model.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { UserRoutes } from "./routes/user.routes.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AuthRoutes } from "./routes/auth.routes.js";

export interface Container {
  checkReadiness: () => Promise<void>;
  userRoutes: UserRoutes;
  authRoutes: AuthRoutes;
}

export function createContainer(): Container {
  const checkReadiness = async () => {
    await AppDataSource.query("SELECT 1");
  };

  const userModel = new UserModel(AppDataSource.manager);
  const userService = new UserService(userModel);
  const userController = new UserController(userService);
  const userRoutes = new UserRoutes(userController);

  const authService = new AuthService(userModel);
  const authController = new AuthController(authService);
  const authRoutes = new AuthRoutes(authController);

  return { checkReadiness, userRoutes, authRoutes };
}
