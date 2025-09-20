import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { AppError } from "../../shared/errors/AppError";

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: "",
        },
      },
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(AppError.validationError("Validation failed", errors));
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Middleware to parse JSON strings in form-data before validation
export const parseFormDataJSON = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch (parseError) {
            // If parsing fails, leave the field as is and let validation handle it
            console.warn(
              `Failed to parse JSON for field ${field}:`,
              parseError
            );
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(AppError.validationError("Invalid query parameters", errors));
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(AppError.validationError("Invalid parameters", errors));
    }

    req.params = value;
    next();
  };
};
