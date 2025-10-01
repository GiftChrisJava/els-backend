import mongoose, { Document, Schema } from "mongoose";

export enum CustomerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BLOCKED = "blocked",
  VIP = "vip",
}

export enum CustomerType {
  INDIVIDUAL = "individual",
  BUSINESS = "business",
  RESELLER = "reseller",
  WHOLESALE = "wholesale",
}

export interface IAddress {
  label?: string;
  isDefault?: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
}

export interface ICustomerPreferences {
  newsletter: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
  language?: string;
  currency?: string;
}

export interface ILoyaltyProgram {
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  joinedAt: Date;
  expiringPoints?: number;
  expiryDate?: Date;
}

export interface ICustomerMetrics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
  cancelledOrders: number;
  returnedOrders: number;
  reviewsCount: number;
  referralCount: number;
}

export interface ICustomer extends Document {
  // User Reference (optional for guest customers)
  user?: mongoose.Types.ObjectId;

  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";

  // Customer Type & Status
  type: CustomerType;
  status: CustomerStatus;
  isGuest?: boolean; // For offline sales without customer registration

  // Business Information (for business customers)
  businessInfo?: {
    companyName?: string;
    taxId?: string;
    website?: string;
    industry?: string;
    employeeCount?: string;
  };

  // Addresses
  addresses: IAddress[];
  defaultShippingAddress?: number;
  defaultBillingAddress?: number;

  // Preferences
  preferences: ICustomerPreferences;

  // Loyalty Program
  loyaltyProgram?: ILoyaltyProgram;

  // Customer Metrics
  metrics: ICustomerMetrics;

  // Tags & Segmentation
  tags?: string[];
  segment?: string;
  customerGroup?: string;

  // Notes
  internalNotes?: string;

  // Metadata
  source?: string;
  referredBy?: mongoose.Types.ObjectId;
  acceptedTerms: boolean;
  acceptedTermsAt?: Date;

  // Timestamps
  lastActivityAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getFullName(): string;
  updateMetrics(): Promise<void>;
  addLoyaltyPoints(points: number): Promise<void>;
  updateLoyaltyTier(): Promise<void>;
  getOrderHistory(limit?: number): Promise<any[]>;
  canMakePurchase(): boolean;
}

const addressSchema = new Schema<IAddress>(
  {
    label: String,
    isDefault: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    company: String,
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: String,
    city: {
      type: String,
      required: true,
    },
    state: String,
    country: {
      type: String,
      required: true,
    },
    postalCode: String,
    phone: String,
  },
  { _id: true }
);

const customerSchema = new Schema<ICustomer>(
  {
    // User Reference (optional for guest customers)
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      sparse: true, // Allows null values but maintains uniqueness for non-null values
      index: true,
    },

    // Basic Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },

    // Customer Type & Status
    type: {
      type: String,
      enum: Object.values(CustomerType),
      default: CustomerType.INDIVIDUAL,
    },
    status: {
      type: String,
      enum: Object.values(CustomerStatus),
      default: CustomerStatus.ACTIVE,
      index: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Business Information
    businessInfo: {
      companyName: String,
      taxId: {
        type: String,
        sparse: true,
        unique: true,
      },
      website: String,
      industry: String,
      employeeCount: String,
    },

    // Addresses
    addresses: {
      type: [addressSchema],
      default: [],
    },
    defaultShippingAddress: Number,
    defaultBillingAddress: Number,

    // Preferences
    preferences: {
      newsletter: {
        type: Boolean,
        default: false,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      language: {
        type: String,
        default: "en",
      },
      currency: {
        type: String,
        default: "USD",
      },
    },

    // Loyalty Program
    loyaltyProgram: {
      points: {
        type: Number,
        default: 0,
        min: 0,
      },
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum"],
        default: "bronze",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      expiringPoints: Number,
      expiryDate: Date,
    },

    // Customer Metrics
    metrics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      lastOrderDate: Date,
      firstOrderDate: Date,
      cancelledOrders: {
        type: Number,
        default: 0,
      },
      returnedOrders: {
        type: Number,
        default: 0,
      },
      reviewsCount: {
        type: Number,
        default: 0,
      },
      referralCount: {
        type: Number,
        default: 0,
      },
    },

    // Tags & Segmentation
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    segment: String,
    customerGroup: String,

    // Notes
    internalNotes: String,

    // Metadata
    source: String,
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    acceptedTerms: {
      type: Boolean,
      default: false,
    },
    acceptedTermsAt: Date,

    // Timestamps
    lastActivityAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
customerSchema.index({ firstName: 1, lastName: 1 });
customerSchema.index({ "metrics.totalSpent": -1 });
customerSchema.index({ "metrics.totalOrders": -1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ tags: 1 });
customerSchema.index({ "loyaltyProgram.tier": 1 });

// Virtual for full name
customerSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get full name
customerSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Method to update customer metrics
customerSchema.methods.updateMetrics = async function () {
  const Order = mongoose.model("Order");

  const orders = await Order.aggregate([
    { $match: { customer: this._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
        lastOrderDate: { $max: "$createdAt" },
        firstOrderDate: { $min: "$createdAt" },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        returnedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
        },
      },
    },
  ]);

  if (orders.length > 0) {
    const metrics = orders[0];
    this.metrics = {
      ...this.metrics,
      totalOrders: metrics.totalOrders,
      totalSpent: metrics.totalSpent,
      averageOrderValue: metrics.totalSpent / metrics.totalOrders,
      lastOrderDate: metrics.lastOrderDate,
      firstOrderDate: metrics.firstOrderDate,
      cancelledOrders: metrics.cancelledOrders,
      returnedOrders: metrics.returnedOrders,
    };

    await this.save();
  }
};

// Method to add loyalty points
customerSchema.methods.addLoyaltyPoints = async function (points: number) {
  if (!this.loyaltyProgram) {
    this.loyaltyProgram = {
      points: 0,
      tier: "bronze",
      joinedAt: new Date(),
    };
  }

  this.loyaltyProgram.points += points;
  await this.updateLoyaltyTier();
  return this.save();
};

// Method to update loyalty tier
customerSchema.methods.updateLoyaltyTier = async function () {
  if (!this.loyaltyProgram) return;

  const points = this.loyaltyProgram.points;
  let tier: "bronze" | "silver" | "gold" | "platinum" = "bronze";

  if (points >= 10000) {
    tier = "platinum";
  } else if (points >= 5000) {
    tier = "gold";
  } else if (points >= 2000) {
    tier = "silver";
  }

  this.loyaltyProgram.tier = tier;
};

// Method to get order history
customerSchema.methods.getOrderHistory = async function (limit: number = 10) {
  const Order = mongoose.model("Order");
  return Order.find({ customer: this._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("items.product", "name sku featuredImage")
    .lean();
};

// Method to check if customer can make purchase
customerSchema.methods.canMakePurchase = function (): boolean {
  return (
    this.status === CustomerStatus.ACTIVE || this.status === CustomerStatus.VIP
  );
};

// Pre-save middleware
customerSchema.pre("save", function (next) {
  // Update last activity
  this.lastActivityAt = new Date();

  // Set accepted terms timestamp
  if (
    this.isModified("acceptedTerms") &&
    this.acceptedTerms &&
    !this.acceptedTermsAt
  ) {
    this.acceptedTermsAt = new Date();
  }

  // Auto-segment based on spending
  if (this.isModified("metrics.totalSpent")) {
    if (this.metrics.totalSpent >= 10000) {
      this.segment = "high-value";
    } else if (this.metrics.totalSpent >= 5000) {
      this.segment = "medium-value";
    } else {
      this.segment = "standard";
    }
  }

  next();
});

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
export { Customer };
