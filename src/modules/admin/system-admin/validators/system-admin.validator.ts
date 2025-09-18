import Joi from "joi";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const createAdminSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(6).max(128).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),

  firstName: Joi.string().min(1).max(100).trim().required().messages({
    "string.min": "First name must be at least 1 character",
    "string.max": "First name cannot exceed 100 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().min(1).max(100).trim().required().messages({
    "string.min": "Last name must be at least 1 character",
    "string.max": "Last name cannot exceed 100 characters",
    "any.required": "Last name is required",
  }),

  role: Joi.string().required().messages({
    "any.required": "Role is required",
  }),

  phoneNumber: Joi.string().optional().messages({
    "string.base": "Please provide a valid phone number",
  }),

  company: Joi.string().max(200).trim().optional(),

  permissions: Joi.array().items(Joi.string().trim()).optional().messages({
    "array.base": "Permissions must be an array of strings",
  }),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).trim().optional(),

  lastName: Joi.string().min(1).max(100).trim().optional(),

  phoneNumber: Joi.string().optional().allow("", null),

  company: Joi.string().max(200).trim().optional().allow("", null),

  status: Joi.string().optional(),

  role: Joi.string().optional(),

  permissions: Joi.array().items(Joi.string().trim()).optional(),
}).min(1); // At least one field must be provided

export const suspendUserSchema = Joi.object({
  reason: Joi.string().min(5).max(1000).required().messages({
    "string.min": "Reason must be at least 5 characters",
    "string.max": "Reason cannot exceed 1000 characters",
    "any.required": "Suspension reason is required",
  }),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().required().messages({
    "any.required": "New role is required",
  }),
});

export const bulkUpdateSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).min(1).max(500).required().messages({
    "array.min": "At least one user ID is required",
    "array.max": "Cannot update more than 500 users at once",
    "any.required": "User IDs array is required",
  }),

  updates: Joi.object({
    status: Joi.string().optional(),
    role: Joi.string().optional(),
    permissions: Joi.array().items(Joi.string().trim()).optional(),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one update field is required",
      "any.required": "Updates object is required",
    }),
});
