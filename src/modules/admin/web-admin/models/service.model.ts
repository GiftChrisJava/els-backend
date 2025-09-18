import mongoose, { Document, Schema } from "mongoose";

export enum ServiceStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  COMING_SOON = "coming-soon",
}

export enum ServiceCategory {
  SOLAR = "solar",
  ELECTRICAL = "electrical",
  INSTALLATION = "installation",
  MAINTENANCE = "maintenance",
  CONSULTATION = "consultation",
  OTHER = "other",
}

export interface IServiceFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface IServicePricing {
  type: "fixed" | "hourly" | "custom" | "quote";
  basePrice?: number;
  currency?: string;
  unit?: string;
  description?: string;
}

export interface IService extends Document {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription?: string;
  category: ServiceCategory;
  features: IServiceFeature[];
  pricing: IServicePricing;
  duration?: string;
  image?: string;
  gallery?: string[];
  icon?: string;
  status: ServiceStatus;
  displayOrder: number;
  isFeatured: boolean;
  metadata?: {
    views?: number;
    inquiries?: number;
    lastUpdated?: Date;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  incrementViews(): Promise<void>;
}

export interface IServiceModel extends mongoose.Model<IService> {
  findFeatured(): mongoose.Query<IService[], IService>;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: [100, "Service name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    longDescription: {
      type: String,
      maxlength: [5000, "Long description cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      enum: Object.values(ServiceCategory),
      default: ServiceCategory.OTHER,
      required: true,
      index: true,
    },
    features: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
        },
        icon: String,
      },
    ],
    pricing: {
      type: {
        type: String,
        enum: ["fixed", "hourly", "custom", "quote"],
        default: "quote",
      },
      basePrice: Number,
      currency: {
        type: String,
        default: "MWK",
      },
      unit: String,
      description: String,
    },
    duration: {
      type: String,
    },
    image: {
      type: String,
    },
    gallery: [
      {
        type: String,
      },
    ],
    icon: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(ServiceStatus),
      default: ServiceStatus.ACTIVE,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      views: {
        type: Number,
        default: 0,
      },
      inquiries: {
        type: Number,
        default: 0,
      },
      lastUpdated: Date,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "services",
  }
);

// Indexes
serviceSchema.index({ name: "text", shortDescription: "text" });
serviceSchema.index({ status: 1, displayOrder: 1 });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ isFeatured: 1, status: 1 });

// Pre-save middleware to generate slug
serviceSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (this.isModified()) {
    this.metadata = this.metadata || {};
    this.metadata.lastUpdated = new Date();
  }

  next();
});

// Static method to find featured services
serviceSchema.statics.findFeatured = function () {
  return this.find({
    isFeatured: true,
    status: ServiceStatus.ACTIVE,
  }).sort("displayOrder");
};

// Instance method to increment views
serviceSchema.methods.incrementViews = async function () {
  this.metadata = this.metadata || {};
  this.metadata.views = (this.metadata.views || 0) + 1;
  await this.save();
};

export const Service = mongoose.model<IService, IServiceModel>(
  "Service",
  serviceSchema
);
