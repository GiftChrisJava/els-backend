import jwt from "jsonwebtoken";
import { appConfig } from "../../../config/app.config";
import { AppError } from "../../../shared/errors/AppError";
import { logger } from "../../../shared/utils/logger.util";
import { IUser } from "../models/user.model";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor() {
    this.jwtSecret = appConfig.jwt.secret;
    this.jwtRefreshSecret = appConfig.jwt.refreshSecret;
    this.jwtExpiresIn = appConfig.jwt.expiresIn;
    this.jwtRefreshExpiresIn = appConfig.jwt.refreshExpiresIn;
  }

  async generateTokens(user: IUser): Promise<Tokens> {
    try {
      const payload: TokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      // Generate access token
      const accessToken = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: appConfig.appName,
        audience: appConfig.appUrl,
      } as any);

      // Generate refresh token
      const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
        expiresIn: this.jwtRefreshExpiresIn,
        issuer: appConfig.appName,
        audience: appConfig.appUrl,
      } as any);

      // Calculate expiry times in seconds
      const expiresIn = this.parseExpiryToSeconds(this.jwtExpiresIn);
      const refreshExpiresIn = this.parseExpiryToSeconds(
        this.jwtRefreshExpiresIn
      );

      return {
        accessToken,
        refreshToken,
        expiresIn,
        refreshExpiresIn,
      };
    } catch (error) {
      logger.error("Error generating tokens:", error);
      throw AppError.internal("Failed to generate authentication tokens");
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: appConfig.appName,
        audience: appConfig.appUrl,
      }) as TokenPayload;

      return payload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw AppError.unauthorized("Access token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw AppError.unauthorized("Invalid access token");
      } else {
        logger.error("Token verification error:", error);
        throw AppError.unauthorized("Token verification failed");
      }
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: appConfig.appName,
        audience: appConfig.appUrl,
      }) as TokenPayload;

      return payload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw AppError.unauthorized("Refresh token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw AppError.unauthorized("Invalid refresh token");
      } else {
        logger.error("Refresh token verification error:", error);
        throw AppError.unauthorized("Refresh token verification failed");
      }
    }
  }

  generateTemporaryToken(payload: any, expiresIn: string = "15m"): string {
    try {
      const options = {
        expiresIn,
        issuer: appConfig.appName,
      };
      return jwt.sign(payload, this.jwtSecret, options as any);
    } catch (error) {
      logger.error("Error generating temporary token:", error);
      throw AppError.internal("Failed to generate temporary token");
    }
  }

  verifyTemporaryToken(token: string): any {
    try {
      const options = {
        issuer: appConfig.appName,
      };
      return jwt.verify(token, this.jwtSecret, options);
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw AppError.badRequest("Token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw AppError.badRequest("Invalid token");
      } else {
        throw AppError.badRequest("Token verification failed");
      }
    }
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 3600;
    }
  }
}
