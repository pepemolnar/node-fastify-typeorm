import { AppDataSource } from "./db/data-source.js";
import { UserModel } from "./models/user.model.js";
import { UserService } from "./services/user.service.js";
import { UserController } from "./controllers/user.controller.js";
import { UserRoutes } from "./routes/user.routes.js";

export interface Container {
  userRoutes: UserRoutes;
  checkReadiness: () => Promise<void>;
}

export function createContainer(): Container {
  const userModel = new UserModel(AppDataSource.manager);
  const userService = new UserService(userModel);
  const userController = new UserController(userService);
  const userRoutes = new UserRoutes(userController);

  const checkReadiness = async () => {
    await AppDataSource.query("SELECT 1");
  };

  return { userRoutes, checkReadiness };
}
