import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { LoginDto, RegisterDto, RefreshDto } from "../types/auth.types.js";
import { env } from "../config/env.config.js";
import type { IRefreshTokenStore } from "../extras/auth/refresh-token-store.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type { JwtUser } from "../extras/auth/auth.plugin.js";

interface Session {
  sub: string;
  role: "user" | "admin";
  family: string;
  jti: string;
}

export class AuthController {
  constructor(
    private authService: AuthService,
    private refreshStore: IRefreshTokenStore,
  ) {}

  async registerController(
    req: FastifyRequest<{ Body: RegisterDto }>,
    reply: FastifyReply,
  ) {
    const user = await this.authService.register(req.body);
    return reply.status(201).send(user);
  }

  async loginController(
    req: FastifyRequest<{ Body: LoginDto }>,
    reply: FastifyReply,
  ) {
    const user = await this.authService.verifyCredentials(req.body);
    // A fresh login starts a new rotation family.
    const family = crypto.randomUUID();
    const jti = crypto.randomUUID();
    await this.refreshStore.issue(family, jti);

    return reply.send(
      await this.signPair(reply, {
        sub: user.id,
        role: user.role,
        family,
        jti,
      }),
    );
  }

  async refreshController(
    req: FastifyRequest<{ Body: RefreshDto }>,
    reply: FastifyReply,
  ) {
    const payload = this.verifyRefreshToken(req, req.body.refreshToken);
    const jti = crypto.randomUUID();
    const result = await this.refreshStore.rotate(
      payload.family,
      payload.jti,
      jti,
    );
    if (result !== "OK")
      throw new HttpError(
        401,
        "Invalid refresh token",
        "INVALID_REFRESH_TOKEN",
      );

    return reply.send(
      await this.signPair(reply, {
        sub: payload.sub,
        role: payload.role,
        family: payload.family,
        jti,
      }),
    );
  }

  async logoutController(
    req: FastifyRequest<{ Body: RefreshDto }>,
    reply: FastifyReply,
  ) {
    try {
      const { family } = this.verifyRefreshToken(req, req.body.refreshToken);
      await this.refreshStore.revoke(family);
    } catch {
      // ignore
    }
    return reply.status(204).send();
  }

  private verifyRefreshToken(
    req: FastifyRequest,
    token: string,
  ): Required<JwtUser> {
    let payload: JwtUser;
    try {
      payload = req.server.jwt.verify<JwtUser>(token);
    } catch {
      throw new HttpError(
        401,
        "Invalid refresh token",
        "INVALID_REFRESH_TOKEN",
      );
    }
    if (payload.typ !== "refresh" || !payload.jti || !payload.family) {
      throw new HttpError(
        401,
        "Invalid refresh token",
        "INVALID_REFRESH_TOKEN",
      );
    }
    return payload as Required<JwtUser>;
  }

  private async signPair(reply: FastifyReply, session: Session) {
    const accessToken = await reply.jwtSign(
      { sub: session.sub, role: session.role, typ: "access" },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    );
    const refreshToken = await reply.jwtSign(
      {
        sub: session.sub,
        role: session.role,
        jti: session.jti,
        family: session.family,
        typ: "refresh",
      },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    );
    return { accessToken, refreshToken };
  }
}
