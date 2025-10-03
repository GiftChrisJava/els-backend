import mongoose, { Document, Schema } from "mongoose";

export enum ProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  OUT_OF_STOCK = "out-of-stock",
  DISCONTINUED = "discontinued",
}

export enum ProductType {
  PHYSICAL = "physical",
  SERVICE = "service",
  DIGITAL = "digital",
}

export enum StockStatus {
  IN_STOCK = "in-stock",
  LOW_STOCK = "low-stock",
  OUT_OF_STOCK = "out-of-stock",
  PRE_ORDER = "pre-order",
}

export interface IProductVariant {
  name: string;
  options: string[];
  price?: number;
  sku?: string;
  stock?: number;
}

export interface IProductSpecification {
  key: string;
  value: string;
  unit?: string;
}

export interface IProductPricing {
  cost?: number;
  price: number;
  compareAtPrice?: number;
  currency: string;
  taxRate?: number;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface IInventory {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  stockStatus: StockStatus;
  warehouse?: string;
  lastRestocked?: Date;
}

export interface IProduct extends Document {
  // Basic Information
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  description: string;
  shortDescription?: string;

  // Categorization
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  tags?: string[];
  brand?: string;

  // Product Type & Status
  type: ProductType;
  status: ProductStatus;

  // Pricing
  pricing: IProductPricing;

  // Inventory
  inventory: IInventory;

  // Variants
  hasVariants: boolean;
  variants?: IProductVariant[];

  // Specifications
  specifications?: IProductSpecification[];

  // Media
  images?: string[];
  featuredImage?: string;
  videos?: string[];
  documents?: string[];

  // Dimensions & Weight (for physical products)
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  weight?: {
    value?: number;
    unit?: string;
  };

  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Ratings & Reviews
  ratings?: {
    average: number;
    count: number;
  };

  // Display Settings
  isFeatured: boolean;
  isNewArrival: boolean;
  displayOrder: number;

  // Sales Metrics
  salesCount: number;
  viewCount: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateStock(quantity: number, operation: "add" | "subtract"): Promise<void>;
  reserveStock(quantity: number): Promise<void>;
  releaseReservedStock(quantity: number): Promise<void>;
  incrementSalesCount(quantity: number): Promise<void>;
  updateStockStatus(): void;
}

const productSchema = new Schema<IProduct>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },

    // Categorization
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
      index: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    brand: {
      type: String,
      trim: true,
    },

    // Product Type & Status
    type: {
      type: String,
      enum: Object.values(ProductType),
      default: ProductType.PHYSICAL,
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.ACTIVE,
      index: true,
    },

    // Pricing
    pricing: {
      cost: {
        type: Number,
        min: [0, "Cost cannot be negative"],
      },
      price: {
        type: Number,
        required: [true, "Product price is required"],
        min: [0, "Price cannot be negative"],
      },
      compareAtPrice: {
        type: Number,
        min: [0, "Compare price cannot be negative"],
      },
      currency: {
        type: String,
        default: "USD",
        uppercase: true,
      },
      taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      discount: {
        type: {
          type: String,
          enum: ["percentage", "fixed"],
        },
        value: Number,
        startDate: Date,
        endDate: Date,
      },
    },

    // Inventory
    inventory: {
      quantity: {
        type: Number,
        default: 0,
        min: [0, "Quantity cannot be negative"],
      },
      reservedQuantity: {
        type: Number,
        default: 0,
        min: [0, "Reserved quantity cannot be negative"],
      },
      availableQuantity: {
        type: Number,
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: [0, "Threshold cannot be negative"],
      },
      trackInventory: {
        type: Boolean,
        default: true,
      },
      allowBackorder: {
        type: Boolean,
        default: false,
      },
      stockStatus: {
        type: String,
        enum: Object.values(StockStatus),
        default: StockStatus.IN_STOCK,
      },
      warehouse: String,
      lastRestocked: Date,
    },

    // Variants
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: String,
        options: [String],
        price: Number,
        sku: String,
        stock: Number,
      },
    ],

    // Specifications
    specifications: [
      {
        key: String,
        value: String,
        unit: String,
      },
    ],

    // Media
    images: [String],
    featuredImage: String,
    videos: [String],
    documents: [String],

    // Dimensions & Weight
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: "cm",
      },
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        default: "kg",
      },
    },

    // SEO
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },

    // Ratings & Reviews
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    // Display Settings
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Sales Metrics
    salesCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
productSchema.index({ name: "text", description: "text" });
productSchema.index({ "pricing.price": 1, "inventory.stockStatus": 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });

// Virtual for calculating effective price
productSchema.virtual("effectivePrice").get(function () {
  const now = new Date();
  if (this.pricing.discount) {
    const { type, value, startDate, endDate } = this.pricing.discount;

    // Check if discount is active
    const isActive =
      (!startDate || startDate <= now) && (!endDate || endDate >= now);

    if (isActive) {
      if (type === "percentage") {
        return this.pricing.price * (1 - value / 100);
      } else {
        return this.pricing.price - value;
      }
    }
  }
  return this.pricing.price;
});

// Pre-save middleware to update inventory status
productSchema.pre("save", function (next) {
  // Update available quantity
  this.inventory.availableQuantity =
    this.inventory.quantity - this.inventory.reservedQuantity;

  // Update stock status
  if (!this.inventory.trackInventory) {
    this.inventory.stockStatus = StockStatus.IN_STOCK;
  } else if (this.inventory.availableQuantity <= 0) {
    this.inventory.stockStatus = StockStatus.OUT_OF_STOCK;
    this.status = ProductStatus.OUT_OF_STOCK;
  } else if (
    this.inventory.availableQuantity <= this.inventory.lowStockThreshold
  ) {
    this.inventory.stockStatus = StockStatus.LOW_STOCK;
  } else {
    this.inventory.stockStatus = StockStatus.IN_STOCK;
  }

  next();
});

// Method to update stock
productSchema.methods.updateStock = async function (
  quantity: number,
  operation: "add" | "subtract"
) {
  if (operation === "add") {
    this.inventory.quantity += quantity;
    this.inventory.lastRestocked = new Date();
  } else {
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
  }

  return this.save();
};

// Method to reserve stock
productSchema.methods.reserveStock = async function (quantity: number) {
  if (
    this.inventory.availableQuantity < quantity &&
    !this.inventory.allowBackorder
  ) {
    throw new Error("Insufficient stock available");
  }

  this.inventory.reservedQuantity += quantity;
  return this.save();
};

// Method to release reserved stock
productSchema.methods.releaseReservedStock = async function (quantity: number) {
  this.inventory.reservedQuantity = Math.max(
    0,
    this.inventory.reservedQuantity - quantity
  );
  return this.save();
};

// Method to increment view count
productSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return this.save();
};

// Method to increment sales count
productSchema.methods.incrementSalesCount = async function (
  quantity: number = 1
) {
  this.salesCount += quantity;
  return this.save();
};

export const Product = mongoose.model<IProduct>("Product", productSchema);
