import { UserRole } from "@core/constants/roles.constants";
import { UserStatus } from "@core/constants/status.constants";
import Joi from "joi";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const createAdminSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "string.min": "Password must be at least 8 characters long",
      "any.required": "Password is required",
    }),

  firstName: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "First name must be at least 2 characters",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "Last name must be at least 2 characters",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required()
    .messages({
      "any.only": "Invalid role specified",
      "any.required": "Role is required",
    }),

  phoneNumber: Joi.string()
    .pattern(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    )
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  company: Joi.string().max(100).trim().optional(),

  permissions: Joi.array().items(Joi.string().trim()).optional().messages({
    "array.base": "Permissions must be an array of strings",
  }),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().optional(),

  lastName: Joi.string().min(2).max(50).trim().optional(),

  phoneNumber: Joi.string()
    .pattern(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    )
    .optional()
    .allow("", null),

  company: Joi.string().max(100).trim().optional().allow("", null),

  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      "any.only": "Invalid status specified",
    }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      "any.only": "Invalid role specified",
    }),

  permissions: Joi.array().items(Joi.string().trim()).optional(),
}).min(1); // At least one field must be provided

export const suspendUserSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    "string.min": "Reason must be at least 10 characters",
    "string.max": "Reason cannot exceed 500 characters",
    "any.required": "Suspension reason is required",
  }),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required()
    .messages({
      "any.only": "Invalid role specified",
      "any.required": "New role is required",
    }),
});

export const bulkUpdateSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .max(100)
    .required()
    .messages({
      "array.min": "At least one user ID is required",
      "array.max": "Cannot update more than 100 users at once",
      "any.required": "User IDs array is required",
    }),

  updates: Joi.object({
    status: Joi.string()
      .valid(...Object.values(UserStatus))
      .optional(),

    role: Joi.string()
      .valid(...Object.values(UserRole))
      .optional(),

    permissions: Joi.array().items(Joi.string().trim()).optional(),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one update field is required",
      "any.required": "Updates object is required",
    }),
});
