import { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  const error = AppError.notFound(message);
  next(error);
};
