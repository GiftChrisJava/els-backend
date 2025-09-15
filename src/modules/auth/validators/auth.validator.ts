import Joi from "joi";

// Password validation pattern
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = Joi.object({
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

  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
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

  phoneNumber: Joi.string()
    .pattern(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    )
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),

  company: Joi.string().max(100).trim().optional().messages({
    "string.max": "Company name cannot exceed 100 characters",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const verifyEmailSchema = Joi.object({
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "Verification code must be 6 digits",
      "string.pattern.base": "Verification code must contain only numbers",
      "any.required": "Verification code is required",
    }),

  email: Joi.string().email().lowercase().trim().optional(),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "Reset code must be 6 digits",
      "string.pattern.base": "Reset code must contain only numbers",
      "any.required": "Reset code is required",
    }),

  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "string.min": "Password must be at least 8 characters long",
      "any.required": "New password is required",
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .invalid(Joi.ref("currentPassword"))
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "string.min": "Password must be at least 8 characters long",
      "any.required": "New password is required",
      "any.invalid": "New password must be different from current password",
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Can come from cookie or body
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().optional(),

  lastName: Joi.string().min(2).max(50).trim().optional(),

  phoneNumber: Joi.string()
    .pattern(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    )
    .optional()
    .allow("", null),

  company: Joi.string().max(100).trim().optional().allow("", null),

  address: Joi.object({
    street: Joi.string().trim().optional().allow("", null),
    city: Joi.string().trim().optional().allow("", null),
    district: Joi.string().trim().optional().allow("", null),
    country: Joi.string().trim().optional().allow("", null),
    postalCode: Joi.string().trim().optional().allow("", null),
  }).optional(),
}).min(1); // At least one field must be provided
