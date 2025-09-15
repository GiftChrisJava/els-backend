export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string = "Bad Request", details?: any): AppError {
    return new AppError(message, 400, true, "BAD_REQUEST", details);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401, true, "UNAUTHORIZED");
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403, true, "FORBIDDEN");
  }

  static notFound(message: string = "Resource not found"): AppError {
    return new AppError(message, 404, true, "NOT_FOUND");
  }

  static conflict(message: string = "Conflict", details?: any): AppError {
    return new AppError(message, 409, true, "CONFLICT", details);
  }

  static validationError(
    message: string = "Validation Error",
    details?: any
  ): AppError {
    return new AppError(message, 422, true, "VALIDATION_ERROR", details);
  }

  static tooManyRequests(message: string = "Too many requests"): AppError {
    return new AppError(message, 429, true, "TOO_MANY_REQUESTS");
  }

  static internal(message: string = "Internal Server Error"): AppError {
    return new AppError(message, 500, false, "INTERNAL_ERROR");
  }
}
