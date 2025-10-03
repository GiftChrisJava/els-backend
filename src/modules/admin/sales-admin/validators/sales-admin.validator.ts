import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { AppError } from "../../../../shared/errors/AppError";
import { OrderStatus, OrderType, PaymentMethod } from "../models/order.model";
import { ProductStatus, ProductType } from "../models/product.model";

// Helper validation function
const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clean up empty strings from multipart form data
    const cleanedBody = { ...req.body };
    Object.keys(cleanedBody).forEach((key) => {
      if (cleanedBody[key] === "") {
        delete cleanedBody[key];
      }
    });

    const { error } = schema.validate(cleanedBody);
    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(message, 400));
    }
    next();
  };
};

// ============= PRODUCT VALIDATORS =============

export const validateCreateProduct = validate(
  Joi.object({
    name: Joi.string().required().max(200),
    sku: Joi.string().required().uppercase(),
    barcode: Joi.string().optional(),
    description: Joi.string().required(),
    shortDescription: Joi.string().max(500).optional(),

    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    brand: Joi.string().optional(),

    type: Joi.string()
      .valid(...Object.values(ProductType))
      .default(ProductType.PHYSICAL),
    status: Joi.string()
      .valid(...Object.values(ProductStatus))
      .default(ProductStatus.ACTIVE),

    pricing: Joi.object({
      cost: Joi.number().min(0).optional(),
      price: Joi.number().min(0).required(),
      compareAtPrice: Joi.number().min(0).optional(),
      currency: Joi.string().default("USD"),
      taxRate: Joi.number().min(0).max(100).default(0),
      discount: Joi.object({
        type: Joi.string().valid("percentage", "fixed").required(),
        value: Joi.number().min(0).required(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
      }).optional(),
    }).required(),

    inventory: Joi.object({
      quantity: Joi.number().min(0).default(0),
      lowStockThreshold: Joi.number().min(0).default(10),
      trackInventory: Joi.boolean().default(true),
      allowBackorder: Joi.boolean().default(false),
      warehouse: Joi.string().optional(),
    }).required(),

    hasVariants: Joi.boolean().default(false),
    variants: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          options: Joi.array().items(Joi.string()).required(),
          price: Joi.number().min(0).optional(),
          sku: Joi.string().optional(),
          stock: Joi.number().min(0).optional(),
        })
      )
      .optional(),

    specifications: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().required(),
          value: Joi.string().required(),
          unit: Joi.string().optional(),
        })
      )
      .optional(),

    images: Joi.array().items(Joi.string()).optional().allow(""),
    featuredImage: Joi.string().optional().allow(""),
    videos: Joi.array().items(Joi.string()).optional(),
    documents: Joi.array().items(Joi.string()).optional(),

    dimensions: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
      unit: Joi.string().default("cm"),
    }).optional(),

    weight: Joi.object({
      value: Joi.number().min(0).optional(),
      unit: Joi.string().default("kg"),
    }).optional(),

    seo: Joi.object({
      metaTitle: Joi.string().optional(),
      metaDescription: Joi.string().optional(),
      keywords: Joi.array().items(Joi.string()).optional(),
    }).optional(),

    isFeatured: Joi.boolean().default(false),
    isNewArrival: Joi.boolean().default(false),
    displayOrder: Joi.number().default(0),
  })
);

export const validateUpdateProduct = validate(
  Joi.object({
    name: Joi.string().max(200).optional(),
    sku: Joi.string().uppercase().optional(),
    barcode: Joi.string().optional(),
    description: Joi.string().optional(),
    shortDescription: Joi.string().max(500).optional(),

    category: Joi.string().optional(),
    subcategory: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    brand: Joi.string().optional(),

    type: Joi.string()
      .valid(...Object.values(ProductType))
      .optional(),
    status: Joi.string()
      .valid(...Object.values(ProductStatus))
      .optional(),

    pricing: Joi.object({
      cost: Joi.number().min(0).optional(),
      price: Joi.number().min(0).optional(),
      compareAtPrice: Joi.number().min(0).optional(),
      currency: Joi.string().optional(),
      taxRate: Joi.number().min(0).max(100).optional(),
      discount: Joi.object({
        type: Joi.string().valid("percentage", "fixed").required(),
        value: Joi.number().min(0).required(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
      }).optional(),
    }).optional(),

    inventory: Joi.object({
      quantity: Joi.number().min(0).optional(),
      lowStockThreshold: Joi.number().min(0).optional(),
      trackInventory: Joi.boolean().optional(),
      allowBackorder: Joi.boolean().optional(),
      warehouse: Joi.string().optional(),
    }).optional(),

    hasVariants: Joi.boolean().optional(),
    variants: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          options: Joi.array().items(Joi.string()).required(),
          price: Joi.number().min(0).optional(),
          sku: Joi.string().optional(),
          stock: Joi.number().min(0).optional(),
        })
      )
      .optional(),

    specifications: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().required(),
          value: Joi.string().required(),
          unit: Joi.string().optional(),
        })
      )
      .optional(),

    images: Joi.array().items(Joi.string()).optional().allow(""),
    featuredImage: Joi.string().optional().allow(""),
    videos: Joi.array().items(Joi.string()).optional(),
    documents: Joi.array().items(Joi.string()).optional(),

    dimensions: Joi.object({
      length: Joi.number().min(0).optional(),
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
      unit: Joi.string().optional(),
    }).optional(),

    weight: Joi.object({
      value: Joi.number().min(0).optional(),
      unit: Joi.string().optional(),
    }).optional(),

    seo: Joi.object({
      metaTitle: Joi.string().optional(),
      metaDescription: Joi.string().optional(),
      keywords: Joi.array().items(Joi.string()).optional(),
    }).optional(),

    isFeatured: Joi.boolean().optional(),
    isNewArrival: Joi.boolean().optional(),
    displayOrder: Joi.number().optional(),
  }).min(1)
);

export const validateUpdateInventory = validate(
  Joi.object({
    quantity: Joi.number().min(1).required(),
    operation: Joi.string().valid("add", "subtract").required(),
    reason: Joi.string().optional(), // For quick inventory updates
  })
);

export const validateBulkUpdateInventory = validate(
  Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          operation: Joi.string().valid("add", "subtract").required(),
        })
      )
      .min(1)
      .required(),
  })
);

// ============= CATEGORY VALIDATORS =============

export const validateCreateCategory = validate(
  Joi.object({
    name: Joi.string().required().max(100),
    description: Joi.string().max(500).optional().allow(""),
    parentCategory: Joi.string().optional().allow(""),
    image: Joi.string().optional().allow(""),
    icon: Joi.string().optional().allow(""),
    displayOrder: Joi.number().default(0),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    seo: Joi.object({
      metaTitle: Joi.string().optional().allow(""),
      metaDescription: Joi.string().optional().allow(""),
      keywords: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  })
);

// ============= ORDER VALIDATORS =============

export const validateCreateOrder = validate(
  Joi.object({
    type: Joi.string()
      .valid(...Object.values(OrderType))
      .default(OrderType.ONLINE),
    priority: Joi.string()
      .valid("low", "normal", "high", "urgent")
      .default("normal"),

    customer: Joi.string().required(),

    items: Joi.array()
      .items(
        Joi.object({
          product: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          price: Joi.number().min(0).required(),
          discount: Joi.number().min(0).default(0),
          tax: Joi.number().min(0).default(0),
          variant: Joi.string().optional(),
          notes: Joi.string().optional(),
        })
      )
      .min(1)
      .required(),

    subtotal: Joi.number().min(0).required(),
    taxAmount: Joi.number().min(0).default(0),
    shippingCost: Joi.number().min(0).default(0),
    discount: Joi.number().min(0).default(0),
    totalAmount: Joi.number().min(0).required(),
    currency: Joi.string().default("USD"),

    paymentMethod: Joi.string()
      .valid(...Object.values(PaymentMethod))
      .required(),
    paymentDetails: Joi.object({
      transactionId: Joi.string().optional(),
      lastFourDigits: Joi.string().optional(),
      paymentGateway: Joi.string().optional(),
    }).optional(),

    shippingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      company: Joi.string().optional(),
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().required(),
      postalCode: Joi.string().optional(),
    }).optional(), // Optional for walk-in/offline sales

    billingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      company: Joi.string().optional(),
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().required(),
      postalCode: Joi.string().optional(),
    }).optional(),

    shippingMethod: Joi.string().optional(),
    estimatedDelivery: Joi.date().optional(),

    customerNotes: Joi.string().optional(),
    internalNotes: Joi.string().optional(),

    source: Joi.string().optional(),
    referralCode: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  })
);

export const validateUpdateOrderStatus = validate(
  Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .required(),
    notes: Joi.string().optional(),
  })
);

export const validateRecordOfflineSale = validate(
  Joi.object({
    // Customer can be ID or guest customer info
    customer: Joi.string().optional(),
    customerInfo: Joi.object({
      name: Joi.string().optional(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
    })
      .optional()
      .or("email", "phone"), // At least email OR phone required for customer lookup

    items: Joi.array()
      .items(
        Joi.object({
          product: Joi.string().required(),
          quantity: Joi.number().min(1).required(),
          price: Joi.number().min(0).required(),
          discount: Joi.number().min(0).default(0),
          tax: Joi.number().min(0).default(0),
          variant: Joi.string().optional(),
          notes: Joi.string().optional(),
        })
      )
      .min(1)
      .required(),

    subtotal: Joi.number().min(0).required(),
    taxAmount: Joi.number().min(0).default(0),
    discount: Joi.number().min(0).default(0),
    totalAmount: Joi.number().min(0).required(),
    currency: Joi.string().default("USD"),

    paymentMethod: Joi.string()
      .valid(...Object.values(PaymentMethod))
      .required(),

    shippingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      company: Joi.string().optional(),
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().required(),
      postalCode: Joi.string().optional(),
    }).optional(), // Optional for offline/walk-in sales

    customerNotes: Joi.string().optional(),
    internalNotes: Joi.string().optional(),
  }).or("customer", "customerInfo") // At least one must be provided
);
