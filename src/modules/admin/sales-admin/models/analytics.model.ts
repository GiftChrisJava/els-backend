import mongoose, { Document, Model, Schema } from "mongoose";

export enum AnalyticsPeriod {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export enum MetricType {
  SALES = "sales",
  ORDERS = "orders",
  CUSTOMERS = "customers",
  PRODUCTS = "products",
  INVENTORY = "inventory",
  REVENUE = "revenue",
}

export interface ISalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  returnRate: number;
  refundAmount: number;
}

export interface IProductMetrics {
  topSellingProducts: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    currentStock: number;
    threshold: number;
  }>;
  categoryPerformance: Array<{
    categoryId: mongoose.Types.ObjectId;
    categoryName: string;
    sales: number;
    revenue: number;
  }>;
}

export interface ICustomerMetrics {
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  averageCustomerLifetimeValue: number;
  topCustomers: Array<{
    customerId: mongoose.Types.ObjectId;
    customerName: string;
    totalSpent: number;
    orderCount: number;
  }>;
  customerSegmentation: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
}

export interface IChannelMetrics {
  online: number;
  offline: number;
  phone: number;
  inStore: number;
}

export interface IAnalytics extends Document {
  // Period Information
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  year: number;
  month?: number;
  week?: number;
  day?: number;
  hour?: number;

  // Sales Metrics
  sales: ISalesMetrics;

  // Product Metrics
  products: IProductMetrics;

  // Customer Metrics
  customers: ICustomerMetrics;

  // Channel Performance
  channels: IChannelMetrics;

  // Payment Methods
  paymentMethods: Map<string, number>;

  // Geographic Distribution
  geographicDistribution?: Map<
    string,
    {
      orders: number;
      revenue: number;
    }
  >;

  // Comparisons
  comparison?: {
    previousPeriod: {
      sales: number;
      orders: number;
      customers: number;
    };
    growthRate: {
      sales: number;
      orders: number;
      customers: number;
    };
  };

  // Metadata
  generatedAt: Date;
  generatedBy?: mongoose.Types.ObjectId;
  isProcessed: boolean;
  processingTime?: number; // in milliseconds

  // Methods
  calculateGrowthRate(previousMetrics: IAnalytics): void;
  generateReport(): any;
}

export interface IAnalyticsModel extends Model<IAnalytics> {
  generateForPeriod(
    period: AnalyticsPeriod,
    startDate: Date,
    endDate: Date,
    userId?: mongoose.Types.ObjectId
  ): Promise<IAnalytics>;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    // Period Information
    period: {
      type: String,
      enum: Object.values(AnalyticsPeriod),
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      index: true,
    },
    week: {
      type: Number,
      min: 1,
      max: 53,
    },
    day: {
      type: Number,
      min: 1,
      max: 31,
    },
    hour: {
      type: Number,
      min: 0,
      max: 23,
    },

    // Sales Metrics
    sales: {
      totalSales: {
        type: Number,
        default: 0,
      },
      totalOrders: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      conversionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      cartAbandonmentRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      returnRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      refundAmount: {
        type: Number,
        default: 0,
      },
    },

    // Product Metrics
    products: {
      topSellingProducts: [
        {
          productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
          },
          productName: String,
          quantity: Number,
          revenue: Number,
        },
      ],
      lowStockProducts: [
        {
          productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
          },
          productName: String,
          currentStock: Number,
          threshold: Number,
        },
      ],
      categoryPerformance: [
        {
          categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
          },
          categoryName: String,
          sales: Number,
          revenue: Number,
        },
      ],
    },

    // Customer Metrics
    customers: {
      newCustomers: {
        type: Number,
        default: 0,
      },
      returningCustomers: {
        type: Number,
        default: 0,
      },
      customerRetentionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      averageCustomerLifetimeValue: {
        type: Number,
        default: 0,
      },
      topCustomers: [
        {
          customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
          },
          customerName: String,
          totalSpent: Number,
          orderCount: Number,
        },
      ],
      customerSegmentation: [
        {
          segment: String,
          count: Number,
          revenue: Number,
        },
      ],
    },

    // Channel Performance
    channels: {
      online: {
        type: Number,
        default: 0,
      },
      offline: {
        type: Number,
        default: 0,
      },
      phone: {
        type: Number,
        default: 0,
      },
      inStore: {
        type: Number,
        default: 0,
      },
    },

    // Payment Methods
    paymentMethods: {
      type: Map,
      of: Number,
      default: new Map(),
    },

    // Geographic Distribution
    geographicDistribution: {
      type: Map,
      of: {
        orders: Number,
        revenue: Number,
      },
    },

    // Comparisons
    comparison: {
      previousPeriod: {
        sales: Number,
        orders: Number,
        customers: Number,
      },
      growthRate: {
        sales: Number,
        orders: Number,
        customers: Number,
      },
    },

    // Metadata
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingTime: Number,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
analyticsSchema.index({ period: 1, startDate: -1 });
analyticsSchema.index({ period: 1, year: 1, month: 1 });
analyticsSchema.index({ isProcessed: 1, generatedAt: -1 });

// Static method to generate analytics for a period
analyticsSchema.statics.generateForPeriod = async function (
  period: AnalyticsPeriod,
  startDate: Date,
  endDate: Date,
  userId?: mongoose.Types.ObjectId
) {
  const startTime = Date.now();

  const Order = mongoose.model("Order");
  const Product = mongoose.model("Product");
  const Customer = mongoose.model("Customer");
  const Category = mongoose.model("Category");

  // Sales Metrics
  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        refundAmount: {
          $sum: {
            $cond: [{ $eq: ["$status", "refunded"] }, "$totalAmount", 0],
          },
        },
        returnCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "refunded"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const salesMetrics = salesData[0] || {
    totalSales: 0,
    totalOrders: 0,
    refundAmount: 0,
    returnCount: 0,
  };

  salesMetrics.averageOrderValue =
    salesMetrics.totalOrders > 0
      ? salesMetrics.totalSales / salesMetrics.totalOrders
      : 0;

  salesMetrics.returnRate =
    salesMetrics.totalOrders > 0
      ? (salesMetrics.returnCount / salesMetrics.totalOrders) * 100
      : 0;

  // Top Selling Products
  const topProducts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ["cancelled", "refunded"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        productName: { $first: "$items.productSnapshot.name" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.total" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  // Low Stock Products
  const lowStockProducts = await Product.find({
    "inventory.trackInventory": true,
    $expr: {
      $lte: ["$inventory.availableQuantity", "$inventory.lowStockThreshold"],
    },
  })
    .select("name inventory.availableQuantity inventory.lowStockThreshold")
    .limit(10)
    .lean();

  // Customer Metrics
  const newCustomersCount = await Customer.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const returningCustomersData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$customer",
        orderCount: { $sum: 1 },
      },
    },
    {
      $match: {
        orderCount: { $gt: 1 },
      },
    },
    {
      $count: "returningCustomers",
    },
  ]);

  const returningCustomers = returningCustomersData[0]?.returningCustomers || 0;

  // Top Customers
  const topCustomers = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ["cancelled", "refunded"] },
      },
    },
    {
      $group: {
        _id: "$customer",
        customerName: { $first: "$customerInfo.name" },
        totalSpent: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
  ]);

  // Channel Performance
  const channelData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$type",
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const channels: any = {
    online: 0,
    offline: 0,
    phone: 0,
    inStore: 0,
  };

  channelData.forEach((channel: any) => {
    if (channel._id in channels) {
      channels[channel._id] = channel.revenue;
    }
  });

  // Payment Methods
  const paymentData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  const paymentMethods = new Map();
  paymentData.forEach((payment: any) => {
    paymentMethods.set(payment._id, payment.revenue);
  });

  // Create analytics record
  const analytics = new this({
    period,
    startDate,
    endDate,
    year: startDate.getFullYear(),
    month:
      period !== AnalyticsPeriod.YEARLY ? startDate.getMonth() + 1 : undefined,
    day: period === AnalyticsPeriod.DAILY ? startDate.getDate() : undefined,
    sales: salesMetrics,
    products: {
      topSellingProducts: topProducts.map((p) => ({
        productId: p._id,
        productName: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
      lowStockProducts: lowStockProducts.map((p) => ({
        productId: p._id,
        productName: p.name,
        currentStock: p.inventory?.availableQuantity || 0,
        threshold: p.inventory?.lowStockThreshold || 0,
      })),
      categoryPerformance: [],
    },
    customers: {
      newCustomers: newCustomersCount,
      returningCustomers,
      customerRetentionRate:
        newCustomersCount > 0
          ? (returningCustomers / (newCustomersCount + returningCustomers)) *
            100
          : 0,
      topCustomers: topCustomers.map((c) => ({
        customerId: c._id,
        customerName: c.customerName,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
      })),
      customerSegmentation: [],
    },
    channels,
    paymentMethods,
    generatedBy: userId,
    isProcessed: true,
    processingTime: Date.now() - startTime,
  });

  await analytics.save();
  return analytics;
};

// Method to calculate growth rate
analyticsSchema.methods.calculateGrowthRate = function (
  previousMetrics: IAnalytics
) {
  if (!previousMetrics) return;

  this.comparison = {
    previousPeriod: {
      sales: previousMetrics.sales.totalSales,
      orders: previousMetrics.sales.totalOrders,
      customers: previousMetrics.customers.newCustomers,
    },
    growthRate: {
      sales:
        previousMetrics.sales.totalSales > 0
          ? ((this.sales.totalSales - previousMetrics.sales.totalSales) /
              previousMetrics.sales.totalSales) *
            100
          : 0,
      orders:
        previousMetrics.sales.totalOrders > 0
          ? ((this.sales.totalOrders - previousMetrics.sales.totalOrders) /
              previousMetrics.sales.totalOrders) *
            100
          : 0,
      customers:
        previousMetrics.customers.newCustomers > 0
          ? ((this.customers.newCustomers -
              previousMetrics.customers.newCustomers) /
              previousMetrics.customers.newCustomers) *
            100
          : 0,
    },
  };
};

// Method to generate report
analyticsSchema.methods.generateReport = function () {
  return {
    period: {
      type: this.period,
      startDate: this.startDate,
      endDate: this.endDate,
    },
    summary: {
      totalRevenue: this.sales.totalSales,
      totalOrders: this.sales.totalOrders,
      averageOrderValue: this.sales.averageOrderValue,
      newCustomers: this.customers.newCustomers,
      topSellingProduct: this.products.topSellingProducts[0],
      topCustomer: this.customers.topCustomers[0],
    },
    sales: this.sales,
    products: {
      topSelling: this.products.topSellingProducts.slice(0, 5),
      lowStock: this.products.lowStockProducts,
      categoryPerformance: this.products.categoryPerformance,
    },
    customers: {
      metrics: {
        new: this.customers.newCustomers,
        returning: this.customers.returningCustomers,
        retentionRate: this.customers.customerRetentionRate,
      },
      topCustomers: this.customers.topCustomers.slice(0, 5),
      segmentation: this.customers.customerSegmentation,
    },
    channels: this.channels,
    paymentMethods: Array.from(this.paymentMethods.entries()).map((entry) => ({
      method: entry[0],
      amount: entry[1],
    })),
    growth: this.comparison,
  };
};

const Analytics = mongoose.model<IAnalytics, IAnalyticsModel>(
  "Analytics",
  analyticsSchema
);
export { Analytics };
