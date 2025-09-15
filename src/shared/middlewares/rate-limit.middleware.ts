import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { appConfig } from "../../config/app.config";
import { AppError } from "../../shared/errors/AppError";

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Store for tracking rate limits by IP and endpoint
const limiters = new Map<string, any>();

export const rateLimiter = (
  name: string = "default",
  maxRequests: number = 100,
  windowMinutes: number = 15,
  options: RateLimitOptions = {}
) => {
  const key = `${name}-${maxRequests}-${windowMinutes}`;

  if (!limiters.has(key)) {
    const limiter = rateLimit({
      windowMs: options.windowMs || windowMinutes * 60 * 1000,
      max: maxRequests,
      message: options.message || `Too many requests, please try again later.`,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: (req: Request) => {
        // Use IP address and user ID if authenticated
        const ip = req.ip || req.connection.remoteAddress || "unknown";
        const userId = req.user?._id || "anonymous";
        return `${ip}-${userId}`;
      },
      handler: (req: Request, res: Response) => {
        throw AppError.tooManyRequests(
          options.message ||
            `Too many ${name} requests. Please wait ${windowMinutes} minutes before trying again.`
        );
      },
      skip: (req: Request) => {
        // Skip rate limiting in test environment
        if (appConfig.env === "test") {
          return true;
        }
        // Skip for system admins (optional)
        if (req.user?.role === "system-admin") {
          return true;
        }
        return false;
      },
    });

    limiters.set(key, limiter);
  }

  return limiters.get(key);
};

// Specific rate limiters for different endpoints
export const authRateLimiter = rateLimiter("auth", 5, 15, {
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

export const apiRateLimiter = rateLimiter("api", 100, 15, {
  message: "API rate limit exceeded. Please slow down your requests.",
});

export const strictRateLimiter = rateLimiter("strict", 3, 60, {
  message: "Maximum attempts reached. Please try again in 1 hour.",
});
