import { NextFunction, Request, Response } from "express";
import { UserStatus } from "../../../core/constants/status.constants";
import { AppError } from "../../../shared/errors/AppError";
import { logger } from "../../../shared/utils/logger.util";
import { Session } from "../models/session.model";
import { User } from "../models/user.model";
import { TokenService } from "../services/token.service";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header or cookie
    const token = extractToken(req);

    if (!token) {
      throw AppError.unauthorized("No authentication token provided");
    }

    // Verify token
    const tokenService = new TokenService();
    const payload = await tokenService.verifyAccessToken(token);

    // Check session validity
    const session = await Session.findActiveSession(token);

    if (!session) {
      throw AppError.unauthorized("Invalid or expired session");
    }

    // Get user
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      throw AppError.unauthorized("User not found");
    }

    // Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw AppError.forbidden(
        `Account is ${user.status}. Please contact support.`
      );
    }

    // Update session activity
    await session.updateActivity();

    // Attach user to request
    req.user = user;
    req.sessionId = session._id.toString();
    req.role = user.role;

    next();
  } catch (error: any) {
    logger.error("Authentication error:", error);

    if (error instanceof AppError) {
      return next(error);
    }

    return next(AppError.unauthorized("Authentication failed"));
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    const tokenService = new TokenService();
    const payload = await tokenService.verifyAccessToken(token);

    const session = await Session.findActiveSession(token);

    if (session) {
      const user = await User.findById(payload.userId).select("-password");

      if (user && user.status === UserStatus.ACTIVE) {
        req.user = user;
        req.sessionId = session._id.toString();
        req.role = user.role;
        await session.updateActivity();
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

/**
 * Pulls the bearer token off the request.
 *
 * Header only, deliberately.
 *
 * A `?token=` query parameter was previously accepted "for file downloads".
 * Nothing in the codebase used it, and it leaked credentials everywhere a URL
 * goes: morgan's `combined` format writes the full query string to the access
 * log, and the same value ends up in proxy logs, browser history and the
 * `Referer` header of any outbound link. Every client here sends the
 * Authorization header, including the CSV export.
 *
 * The cookie branch is also gone: `cookie-parser` is not installed, so
 * `req.cookies` was always undefined and the branch was unreachable. Add the
 * parser first if cookie auth is ever wanted.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}
