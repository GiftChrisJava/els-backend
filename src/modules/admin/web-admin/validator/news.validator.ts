import Joi from "joi";

/**
 * Validators for the news module.
 *
 * Multipart bodies deliver everything as strings, so booleans accept
 * `"true"`/`"false"` alongside real booleans and are coerced by Joi.
 */

const booleanFromForm = Joi.boolean().truthy("true").falsy("false");

/**
 * Tags arrive either as a repeated `tags[]` field (an array), or as a single
 * value when only one tag was sent. `Joi.array().single()` accepts both.
 */
const tagsSchema = Joi.array()
  .items(Joi.string().trim().max(50).allow(""))
  .single()
  .max(25)
  .messages({
    "array.max": "An article can have at most 25 tags",
  });

export const createNewsSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(200).messages({
    "any.required": "Title is required",
    "string.empty": "Title is required",
    "string.min": "Title must be at least 3 characters",
    "string.max": "Title cannot exceed 200 characters",
  }),

  summary: Joi.string().required().trim().min(10).max(500).messages({
    "any.required": "Summary is required",
    "string.empty": "Summary is required",
    "string.min": "Summary must be at least 10 characters",
    "string.max": "Summary cannot exceed 500 characters",
  }),

  content: Joi.string().required().min(20).messages({
    "any.required": "Content is required",
    "string.empty": "Content is required",
    "string.min": "Content must be at least 20 characters",
  }),

  category: Joi.string().required().trim().max(60).messages({
    "any.required": "Category is required",
    "string.empty": "Category is required",
  }),

  // Optional: generated from the title when absent.
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(220)
    .optional()
    .messages({
      "string.pattern.base":
        "Slug may only contain lowercase letters, numbers and single hyphens",
    }),

  tags: tagsSchema.optional(),

  isPublished: booleanFromForm.optional(),
  isFeatured: booleanFromForm.optional(),
});

export const updateNewsSchema = Joi.object({
  coverImage: Joi.string().uri().optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  title: Joi.string().trim().min(3).max(200).optional(),

  summary: Joi.string().trim().min(10).max(500).optional(),

  content: Joi.string().min(20).optional(),

  category: Joi.string().trim().max(60).optional(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(220)
    .optional(),

  // An empty array is meaningful here: it clears every tag.
  tags: tagsSchema.optional(),

  isPublished: booleanFromForm.optional(),
  isFeatured: booleanFromForm.optional(),
})
  .min(1)
  .messages({
    "object.min": "Provide at least one field to update",
  });

export const setNewsPublishedSchema = Joi.object({
  isPublished: booleanFromForm.required().messages({
    "any.required": "isPublished is required",
  }),
});

export const newsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(200).allow("").optional(),
  status: Joi.string().valid("published", "draft").allow("").optional(),
  category: Joi.string().trim().max(60).allow("").optional(),
  tag: Joi.string().trim().max(50).allow("").optional(),
  featured: booleanFromForm.optional(),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "publishedAt", "title", "viewCount")
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
}).unknown(true);
