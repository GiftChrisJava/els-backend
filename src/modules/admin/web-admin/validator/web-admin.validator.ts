import Joi from "joi";
import {
  ButtonStyle,
  SlideStatus,
  SlideType,
} from "../models/landing-slide.model";
import { ProjectCategory, ProjectStatus } from "../models/project.model";
import { ServiceCategory, ServiceStatus } from "../models/service.model";
import { StaffDepartment, StaffStatus } from "../models/staff.model";
import {
  TestimonialStatus,
  TestimonialType,
} from "../models/testimonial.model";

// =============== SERVICE VALIDATORS ===============

export const createServiceSchema = Joi.object({
  name: Joi.string().required().trim().max(100).messages({
    "any.required": "Service name is required",
    "string.max": "Service name cannot exceed 100 characters",
  }),

  shortDescription: Joi.string().required().max(500).messages({
    "any.required": "Short description is required",
    "string.max": "Short description cannot exceed 500 characters",
  }),

  longDescription: Joi.string().max(5000).optional(),

  category: Joi.string()
    .valid(...Object.values(ServiceCategory))
    .required()
    .messages({
      "any.required": "Service category is required",
      "any.only": "Invalid service category",
    }),

  features: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        icon: Joi.string().optional(),
      })
    )
    .optional(),

  pricing: Joi.object({
    type: Joi.string()
      .valid("fixed", "hourly", "custom", "quote")
      .default("quote"),
    basePrice: Joi.number().min(0).optional(),
    currency: Joi.string().default("MWK"),
    unit: Joi.string().optional(),
    description: Joi.string().optional(),
  }).optional(),

  duration: Joi.string().optional(),
  image: Joi.string().optional(),
  gallery: Joi.array().items(Joi.string()).optional(),
  icon: Joi.string().optional(),
  status: Joi.string()
    .valid(...Object.values(ServiceStatus))
    .default(ServiceStatus.ACTIVE),
  displayOrder: Joi.number().default(0),
  isFeatured: Joi.boolean().default(false),

  seo: Joi.object({
    metaTitle: Joi.string().optional(),
    metaDescription: Joi.string().optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

export const updateServiceSchema = createServiceSchema.fork(
  ["name", "shortDescription", "category"],
  (schema) => schema.optional()
);

// =============== PROJECT VALIDATORS ===============

export const createProjectSchema = Joi.object({
  title: Joi.string().required().trim().max(200).messages({
    "any.required": "Project title is required",
    "string.max": "Project title cannot exceed 200 characters",
  }),

  client: Joi.string().required().trim().messages({
    "any.required": "Client name is required",
  }),

  clientLogo: Joi.string().optional(),

  description: Joi.string().required().max(5000).messages({
    "any.required": "Project description is required",
    "string.max": "Description cannot exceed 5000 characters",
  }),

  category: Joi.string()
    .valid(...Object.values(ProjectCategory))
    .required()
    .messages({
      "any.required": "Project category is required",
      "any.only": "Invalid project category",
    }),

  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .default(ProjectStatus.PLANNING),

  startDate: Joi.date().required().messages({
    "any.required": "Project start date is required",
  }),

  endDate: Joi.date().greater(Joi.ref("startDate")).optional().messages({
    "date.greater": "End date must be after start date",
  }),

  location: Joi.object({
    city: Joi.string().required(),
    district: Joi.string().optional(),
    country: Joi.string().default("Malawi"),
  }).required(),

  images: Joi.object({
    featured: Joi.string().required().messages({
      "any.required": "Featured image is required",
    }),
    gallery: Joi.array().items(Joi.string()).optional(),
    beforeAfter: Joi.array()
      .items(
        Joi.object({
          before: Joi.string(),
          after: Joi.string(),
        })
      )
      .optional(),
  }).required(),

  technicalSpecs: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().required(),
        value: Joi.string().required(),
        unit: Joi.string().optional(),
      })
    )
    .optional(),

  technologies: Joi.array().items(Joi.string()).optional(),
  teamSize: Joi.number().min(1).optional(),

  projectValue: Joi.object({
    amount: Joi.number().min(0),
    currency: Joi.string().default("MWK"),
    displayPublicly: Joi.boolean().default(false),
  }).optional(),

  challenges: Joi.string().max(2000).optional(),
  solutions: Joi.string().max(2000).optional(),
  outcomes: Joi.array().items(Joi.string()).optional(),

  testimonial: Joi.object({
    content: Joi.string(),
    author: Joi.string(),
    position: Joi.string(),
  }).optional(),

  isFeatured: Joi.boolean().default(false),
  isPublished: Joi.boolean().default(false),
  displayOrder: Joi.number().default(0),
  tags: Joi.array().items(Joi.string()).optional(),
  relatedServices: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

export const updateProjectSchema = createProjectSchema.fork(
  [
    "title",
    "client",
    "description",
    "category",
    "startDate",
    "location",
    "images",
  ],
  (schema) => schema.optional()
);

// =============== STAFF VALIDATORS ===============

export const createStaffSchema = Joi.object({
  employeeId: Joi.string().optional(),
  userId: Joi.string().hex().length(24).optional(),

  firstName: Joi.string().required().trim().messages({
    "any.required": "First name is required",
  }),

  lastName: Joi.string().required().trim().messages({
    "any.required": "Last name is required",
  }),

  displayName: Joi.string().trim().optional(),

  position: Joi.string().required().trim().messages({
    "any.required": "Position is required",
  }),

  department: Joi.string()
    .valid(...Object.values(StaffDepartment))
    .required()
    .messages({
      "any.required": "Department is required",
      "any.only": "Invalid department",
    }),

  email: Joi.string().email().required().lowercase().trim().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
  }),

  phone: Joi.string().optional(),

  bio: Joi.string().required().max(1000).messages({
    "any.required": "Bio is required",
    "string.max": "Bio cannot exceed 1000 characters",
  }),

  profileImage: Joi.string().required().messages({
    "any.required": "Profile image is required",
  }),

  coverImage: Joi.string().optional(),

  qualifications: Joi.array()
    .items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        year: Joi.number().required(),
      })
    )
    .optional(),

  certifications: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        issuer: Joi.string().required(),
        year: Joi.number().required(),
        expiryYear: Joi.number().optional(),
      })
    )
    .optional(),

  skills: Joi.array().items(Joi.string()).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  joinedDate: Joi.date().optional(),

  socialLinks: Joi.object({
    linkedin: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    facebook: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    whatsapp: Joi.string().optional(),
  }).optional(),

  achievements: Joi.array().items(Joi.string()).optional(),
  specializations: Joi.array().items(Joi.string()).optional(),
  languages: Joi.array().items(Joi.string()).optional(),

  isTeamLead: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  isPublished: Joi.boolean().default(true),
  displayOrder: Joi.number().default(0),
  status: Joi.string()
    .valid(...Object.values(StaffStatus))
    .default(StaffStatus.ACTIVE),
});

export const updateStaffSchema = createStaffSchema.fork(
  [
    "firstName",
    "lastName",
    "position",
    "department",
    "email",
    "bio",
    "profileImage",
  ],
  (schema) => schema.optional()
);

// =============== TESTIMONIAL VALIDATORS ===============

export const createTestimonialSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(TestimonialType))
    .default(TestimonialType.TEXT),

  content: Joi.string().required().min(20).max(2000).messages({
    "any.required": "Testimonial content is required",
    "string.min": "Testimonial must be at least 20 characters",
    "string.max": "Testimonial cannot exceed 2000 characters",
  }),

  rating: Joi.number().required().min(1).max(5).messages({
    "any.required": "Rating is required",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
  }),

  author: Joi.object({
    name: Joi.string().required().trim(),
    position: Joi.string().trim().optional(),
    company: Joi.string().trim().optional(),
    email: Joi.string().email().lowercase().optional(),
    phone: Joi.string().optional(),
    image: Joi.string().optional(),
  }).required(),

  project: Joi.string().hex().length(24).optional(),
  service: Joi.string().hex().length(24).optional(),
  product: Joi.string().hex().length(24).optional(),

  mediaUrl: Joi.string().uri().optional(),
  thumbnailUrl: Joi.string().uri().optional(),

  status: Joi.string()
    .valid(...Object.values(TestimonialStatus))
    .default(TestimonialStatus.PENDING),

  isFeatured: Joi.boolean().default(false),
  isPublished: Joi.boolean().default(false),
  displayOrder: Joi.number().default(0),

  tags: Joi.array().items(Joi.string()).optional(),
  source: Joi.string().optional(),

  socialProof: Joi.object({
    platform: Joi.string().optional(),
    profileUrl: Joi.string().uri().optional(),
    postUrl: Joi.string().uri().optional(),
  }).optional(),

  adminNotes: Joi.string().optional(),
});

export const rejectTestimonialSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500).messages({
    "any.required": "Rejection reason is required",
    "string.min": "Reason must be at least 10 characters",
    "string.max": "Reason cannot exceed 500 characters",
  }),
});

// =============== LANDING SLIDE VALIDATORS ===============

export const createSlideSchema = Joi.object({
  title: Joi.string().required().trim().max(100).messages({
    "any.required": "Slide title is required",
    "string.max": "Title cannot exceed 100 characters",
  }),

  type: Joi.string()
    .valid(...Object.values(SlideType))
    .default(SlideType.IMAGE),

  content: Joi.object({
    heading: Joi.string().max(200).optional(),
    subheading: Joi.string().max(150).optional(),
    description: Joi.string().max(500).optional(),
    highlightText: Joi.string().optional(),
    buttons: Joi.array()
      .items(
        Joi.object({
          text: Joi.string().required(),
          link: Joi.string().required(),
          style: Joi.string()
            .valid(...Object.values(ButtonStyle))
            .default(ButtonStyle.PRIMARY),
          target: Joi.string().valid("_self", "_blank").default("_self"),
          icon: Joi.string().optional(),
        })
      )
      .optional(),
    customHtml: Joi.string().optional(),
  }),

  media: Joi.object({
    desktop: Joi.string().required().messages({
      "any.required": "Desktop image is required",
    }),
    mobile: Joi.string().optional(),
    tablet: Joi.string().optional(),
    alt: Joi.string().optional(),
    videoUrl: Joi.string().uri().optional(),
    thumbnailUrl: Joi.string().optional(),
  }).required(),

  animation: Joi.object({
    entrance: Joi.string().optional(),
    duration: Joi.number().optional(),
    delay: Joi.number().optional(),
    easing: Joi.string().optional(),
  }).optional(),

  overlay: Joi.object({
    enabled: Joi.boolean().default(false),
    color: Joi.string().optional(),
    opacity: Joi.number().min(0).max(1).optional(),
  }).optional(),

  position: Joi.object({
    horizontal: Joi.string().valid("left", "center", "right").default("center"),
    vertical: Joi.string().valid("top", "center", "bottom").default("center"),
  }).optional(),

  status: Joi.string()
    .valid(...Object.values(SlideStatus))
    .default(SlideStatus.INACTIVE),

  displayOrder: Joi.number().default(0),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).optional().messages({
    "date.greater": "Valid until must be after valid from date",
  }),

  targetAudience: Joi.array().items(Joi.string()).optional(),

  deviceVisibility: Joi.object({
    desktop: Joi.boolean().default(true),
    tablet: Joi.boolean().default(true),
    mobile: Joi.boolean().default(true),
  }).optional(),

  seo: Joi.object({
    altText: Joi.string().optional(),
    ariaLabel: Joi.string().optional(),
  }).optional(),

  tags: Joi.array().items(Joi.string()).optional(),
});

export const updateSlideSchema = createSlideSchema.fork(
  ["title", "media"],
  (schema) => schema.optional()
);

export const reorderSlidesSchema = Joi.object({
  slides: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().hex().length(24).required(),
        order: Joi.number().required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "any.required": "Slides array is required",
      "array.min": "At least one slide is required",
    }),
});
