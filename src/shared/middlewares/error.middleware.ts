import { NextFunction, Request, Response } from "express";
import { appConfig } from "../../config/app.config";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/utils/logger.util";

interface ErrorResponse {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  path: string;
  requestId?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as any;
  error.message = err.message;

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.email,
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Invalid ID format";
    error = new AppError(message, 400, true, "INVALID_ID");
  }

  // Mongoose duplicate key
  if ((error.code === 11000 || error.code === "11000") && error.keyValue) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 409, true, "DUPLICATE_KEY", { field });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values((err as any).errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    const message = "Validation failed";
    error = new AppError(message, 422, true, "VALIDATION_ERROR", errors);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401, true, "INVALID_TOKEN");
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401, true, "TOKEN_EXPIRED");
  }

  // Multer errors (file upload)
  if (err.name === "MulterError") {
    let message = "File upload error";
    let code = "FILE_UPLOAD_ERROR";

    if ((err as any).code === "FILE_TOO_LARGE") {
      message = "File size too large";
      code = "FILE_TOO_LARGE";
    } else if ((err as any).code === "LIMIT_FILE_COUNT") {
      message = "Too many files";
      code = "TOO_MANY_FILES";
    } else if ((err as any).code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field";
      code = "UNEXPECTED_FIELD";
    }

    error = new AppError(message, 400, true, code);
  }

  // MongoDB connection errors
  if (err.name === "MongoNetworkError" || err.name === "MongoServerError") {
    const message = "Database connection error";
    error = new AppError(message, 503, false, "DATABASE_ERROR");
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const isOperational =
    error.isOperational !== undefined ? error.isOperational : false;

  // Prepare response
  const response: ErrorResponse = {
    success: false,
    message: isOperational ? message : "Something went wrong",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    requestId: req.id,
  };

  // Add error details in development
  if (appConfig.isDevelopment() || isOperational) {
    response.error = {
      code: error.code,
      details: error.details,
      stack: appConfig.isDevelopment() ? error.stack : undefined,
    };
  }

  // Send error response
  res.status(statusCode).json(response);
};
