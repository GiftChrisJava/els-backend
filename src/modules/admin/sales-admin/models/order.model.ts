import mongoose, { Document, Schema } from "mongoose";

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  FAILED = "failed",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially-refunded",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  BANK_TRANSFER = "bank-transfer",
  MOBILE_MONEY = "mobile-money",
  PAYPAL = "paypal",
  OTHER = "other",
}

export enum OrderType {
  ONLINE = "online",
  OFFLINE = "offline",
  PHONE = "phone",
  IN_STORE = "in-store",
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productSnapshot: {
    name: string;
    sku: string;
    price: number;
    image?: string;
  };
  quantity: number;
  price: number;
  discount?: number;
  tax?: number;
  total: number;
  variant?: string;
  notes?: string;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface IOrderTimeline {
  status: OrderStatus;
  description?: string;
  updatedBy?: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface IOrder extends Document {
  // Order Information
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  priority?: "low" | "normal" | "high" | "urgent";

  // Customer Information
  customer: mongoose.Types.ObjectId;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };

  // Items
  items: IOrderItem[];

  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  currency: string;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    transactionId?: string;
    paidAt?: Date;
    paidAmount?: number;
    refundedAmount?: number;
    lastFourDigits?: string;
    paymentGateway?: string;
  };

  // Shipping
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress;
  shippingMethod?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;

  // Timeline
  timeline: IOrderTimeline[];

  // Notes
  customerNotes?: string;
  internalNotes?: string;

  // Metadata
  source?: string;
  referralCode?: string;
  tags?: string[];
  customFields?: Map<string, any>;

  // Staff Management
  assignedTo?: mongoose.Types.ObjectId;
  processedBy?: mongoose.Types.ObjectId;

  // Timestamps
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateTotals(): void;
  addTimeline(
    status: OrderStatus,
    description?: string,
    userId?: mongoose.Types.ObjectId
  ): Promise<void>;
  canBeCancelled(): boolean;
  canBeRefunded(): boolean;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productSnapshot: {
      name: { type: String, required: true },
      sku: { type: String, required: true },
      price: { type: Number, required: true },
      image: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Total cannot be negative"],
    },
    variant: String,
    notes: String,
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: String,
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    postalCode: String,
  },
  { _id: false }
);

const orderTimelineSchema = new Schema<IOrderTimeline>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    description: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    // Order Information
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.ONLINE,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Customer Information
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    // Items
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items: IOrderItem[]) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, "Tax amount cannot be negative"],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, "Shipping cost cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paymentDetails: {
      transactionId: String,
      paidAt: Date,
      paidAmount: Number,
      refundedAmount: { type: Number, default: 0 },
      lastFourDigits: String,
      paymentGateway: String,
    },

    // Shipping
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    billingAddress: shippingAddressSchema,
    shippingMethod: String,
    trackingNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    estimatedDelivery: Date,
    actualDelivery: Date,

    // Timeline
    timeline: {
      type: [orderTimelineSchema],
      default: [],
    },

    // Notes
    customerNotes: String,
    internalNotes: String,

    // Metadata
    source: String,
    referralCode: String,
    tags: [String],
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    // Staff Management
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Timestamps
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ "customerInfo.email": 1 });
orderSchema.index({ totalAmount: -1 });

// Generate unique order number
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Find the last order of the day
    const lastOrder = await Order.findOne({
      orderNumber: new RegExp(`^ORD-${year}${month}${day}-`),
    }).sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split("-")[2]);
      sequence = lastSequence + 1;
    }

    this.orderNumber = `ORD-${year}${month}${day}-${String(sequence).padStart(
      4,
      "0"
    )}`;
  }

  // Add initial timeline entry
  if (this.isNew) {
    this.timeline.push({
      status: OrderStatus.PENDING,
      description: "Order created",
      updatedBy: this.createdBy,
      timestamp: new Date(),
    });
  }

  next();
});

// Method to calculate totals
orderSchema.methods.calculateTotals = function () {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity - (item.discount || 0);
    item.total = itemTotal + (item.tax || 0);
    return sum + itemTotal;
  }, 0);

  // Calculate total amount
  this.totalAmount =
    this.subtotal + this.taxAmount + this.shippingCost - this.discount;
};

// Method to add timeline entry
orderSchema.methods.addTimeline = async function (
  status: OrderStatus,
  description?: string,
  userId?: mongoose.Types.ObjectId
) {
  this.timeline.push({
    status,
    description,
    updatedBy: userId,
    timestamp: new Date(),
  });

  this.status = status;

  // Update status timestamps
  switch (status) {
    case OrderStatus.CONFIRMED:
      this.confirmedAt = new Date();
      break;
    case OrderStatus.SHIPPED:
      this.shippedAt = new Date();
      break;
    case OrderStatus.DELIVERED:
      this.deliveredAt = new Date();
      this.actualDelivery = new Date();
      break;
    case OrderStatus.CANCELLED:
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function (): boolean {
  const nonCancellableStatuses = [
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];
  return !nonCancellableStatuses.includes(this.status);
};

// Method to check if order can be refunded
orderSchema.methods.canBeRefunded = function (): boolean {
  return (
    this.paymentStatus === PaymentStatus.PAID &&
    this.status !== OrderStatus.REFUNDED
  );
};

// Pre-save middleware to calculate totals
orderSchema.pre("save", function (next) {
  if (
    this.isModified("items") ||
    this.isModified("shippingCost") ||
    this.isModified("discount") ||
    this.isModified("taxAmount")
  ) {
    this.calculateTotals();
  }
  next();
});

const Order = mongoose.model<IOrder>("Order", orderSchema);
export { Order };
