import mongoose from "mongoose";
import slugify from "slugify";
import { AppError } from "../../../../shared/errors/AppError";
import { AppwriteService } from "../../../../shared/services/appwrite.service";
import {
  Analytics,
  AnalyticsPeriod,
} from "../../sales-admin/models/analytics.model";
import { Category } from "../models/category.model";
import { Customer } from "../models/customer.model";
import { Order, OrderStatus, PaymentStatus } from "../models/order.model";
import { Product } from "../models/product.model";

export class SalesAdminService {
  private appwriteService: AppwriteService;

  constructor() {
    this.appwriteService = new AppwriteService();
  }

  // ============= PRODUCT MANAGEMENT =============

  /**
   * Create a new product
   */
  async createProduct(productData: any, userId: string) {
    try {
      // Generate slug from product name
      productData.slug = slugify(productData.name, { lower: true });

      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: productData.sku });
      if (existingProduct) {
        throw new AppError("Product with this SKU already exists", 400);
      }

      // Images are already uploaded to Appwrite by the controller
      // No need to re-process them here

      // Set creator
      productData.createdBy = userId;

      // Create product
      const product = new Product(productData);
      await product.save();

      // Update category product count
      if (productData.category) {
        const category = await Category.findById(productData.category);
        if (category) {
          await category.updateProductCount();
        }
      }

      return product;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to create product", 400);
    }
  }

  /**
   * Update a product
   */
  async updateProduct(productId: string, updateData: any, userId: string) {
    try {
      // If name is being updated, regenerate slug
      if (updateData.name) {
        updateData.slug = slugify(updateData.name, { lower: true });
      }

      // Images are already uploaded to Appwrite by the controller
      // No need to re-process them here

      // Set modifier
      updateData.lastModifiedBy = userId;

      const product = await Product.findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      // Update category product counts if category changed
      if (updateData.category) {
        const oldCategory = await Category.findById(product.category);
        const newCategory = await Category.findById(updateData.category);

        if (oldCategory) await oldCategory.updateProductCount();
        if (newCategory) await newCategory.updateProductCount();
      }

      return product;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to update product", 400);
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError("Product not found", 404);
      }

      // Check if product has pending orders
      const pendingOrders = await Order.countDocuments({
        "items.product": productId,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      });

      if (pendingOrders > 0) {
        throw new AppError("Cannot delete product with pending orders", 400);
      }

      await product.deleteOne();

      // Update category product count
      const category = await Category.findById(product.category);
      if (category) {
        await category.updateProductCount();
      }

      return { message: "Product deleted successfully" };
    } catch (error: any) {
      throw new AppError(error.message || "Failed to delete product", 400);
    }
  }

  /**
   * Get all products with filters
   */
  async getProducts(filters: any = {}, pagination: any = {}) {
    try {
      const {
        search,
        category,
        status,
        minPrice,
        maxPrice,
        inStock,
        featured,
      } = filters;

      const { page = 1, limit = 20, sort = "-createdAt" } = pagination;

      const query: any = {};

      // Apply filters
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
        ];
      }

      if (category) query.category = category;
      if (status) query.status = status;
      if (featured !== undefined) query.isFeatured = featured;

      if (minPrice || maxPrice) {
        query["pricing.price"] = {};
        if (minPrice) query["pricing.price"].$gte = minPrice;
        if (maxPrice) query["pricing.price"].$lte = maxPrice;
      }

      if (inStock !== undefined) {
        if (inStock) {
          query["inventory.stockStatus"] = { $ne: "out-of-stock" };
        } else {
          query["inventory.stockStatus"] = "out-of-stock";
        }
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate("category", "name slug")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);

      return {
        products,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error: any) {
      throw new AppError(error.message || "Failed to fetch products", 400);
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(
    productId: string,
    quantity: number,
    operation: "add" | "subtract",
    userId: string
  ) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError("Product not found", 404);
      }

      await product.updateStock(quantity, operation);
      product.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await product.save();

      return product;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to update inventory", 400);
    }
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(
    updates: Array<{
      productId: string;
      quantity: number;
      operation: "add" | "subtract";
    }>,
    userId: string
  ) {
    try {
      const results = [];

      for (const update of updates) {
        const product = await this.updateInventory(
          update.productId,
          update.quantity,
          update.operation,
          userId
        );
        results.push(product);
      }

      return results;
    } catch (error: any) {
      throw AppError.badRequest(
        error.message || "Failed to bulk update inventory"
      );
    }
  }

  // ============= CATEGORY MANAGEMENT =============

  /**
   * Create a new category
   */
  async createCategory(categoryData: any, userId: string) {
    try {
      categoryData.slug = slugify(categoryData.name, { lower: true });
      categoryData.createdBy = userId;

      // Images are already uploaded to Appwrite by the controller
      // No need to re-process them here

      const category = new Category(categoryData);
      await category.save();

      return category;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to create category", 400);
    }
  }

  /**
   * Get category tree
   */
  async getCategoryTree() {
    try {
      const tree = await Category.buildTree();
      return tree;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to fetch category tree", 400);
    }
  }

  // ============= ORDER MANAGEMENT =============

  /**
   * Create a new order
   */
  async createOrder(orderData: any, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate customer
      const customer = await Customer.findById(orderData.customer);
      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      if (!customer.canMakePurchase()) {
        throw new AppError("Customer is not allowed to make purchases", 400);
      }

      // Set customer info
      orderData.customerInfo = {
        name: customer.getFullName(),
        email: customer.email,
        phone: customer.phone,
      };

      // Process order items and reserve inventory
      for (const item of orderData.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new AppError(`Product ${item.product} not found`, 404);
        }

        // Set product snapshot
        item.productSnapshot = {
          name: product.name,
          sku: product.sku,
          price: product.pricing.price,
          image: product.featuredImage,
        };

        // Calculate item total
        item.total =
          item.price * item.quantity - (item.discount || 0) + (item.tax || 0);

        // Reserve inventory
        if (product.inventory.trackInventory) {
          await product.reserveStock(item.quantity);
        }
      }

      // Set creator
      orderData.createdBy = userId;

      // Create order
      const order = new Order(orderData);
      await order.save({ session });

      // Update customer metrics
      await customer.updateMetrics();

      // Update product sales count
      for (const item of orderData.items) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          await product.incrementSalesCount(item.quantity);
        }
      }

      await session.commitTransaction();
      return order;
    } catch (error: any) {
      await session.abortTransaction();
      throw new AppError(error.message || "Failed to create order", 400);
    } finally {
      session.endSession();
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userId: string,
    notes?: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new AppError("Order not found", 404);
      }

      // Add timeline entry
      await order.addTimeline(
        status,
        notes,
        new mongoose.Types.ObjectId(userId)
      );

      // Handle inventory based on status
      if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
        // Release reserved inventory
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (product && product.inventory.trackInventory) {
            await product.releaseReservedStock(item.quantity);

            if (status === OrderStatus.CANCELLED) {
              // Decrement sales count if order is cancelled
              product.salesCount = Math.max(
                0,
                product.salesCount - item.quantity
              );
              await product.save({ session });
            }
          }
        }
      } else if (status === OrderStatus.DELIVERED) {
        // Convert reserved stock to sold
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (product && product.inventory.trackInventory) {
            product.inventory.reservedQuantity = Math.max(
              0,
              product.inventory.reservedQuantity - item.quantity
            );
            await product.save({ session });
          }
        }

        // Update customer loyalty points
        const customer = await Customer.findById(order.customer).session(
          session
        );
        if (customer) {
          const points = Math.floor(order.totalAmount / 10); // 1 point per $10
          await customer.addLoyaltyPoints(points);
        }
      }

      await session.commitTransaction();
      return order;
    } catch (error: any) {
      await session.abortTransaction();
      throw new AppError(error.message || "Failed to update order status", 400);
    } finally {
      session.endSession();
    }
  }

  /**
   * Record offline sale
   */
  async recordOfflineSale(saleData: any, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Handle customer - find existing or create new
      if (!saleData.customer && saleData.customerInfo) {
        const { email, phone, firstName, lastName, name } =
          saleData.customerInfo;

        // Search for existing customer by email or phone
        let customer = null;

        if (email) {
          customer = await Customer.findOne({ email }).session(session);
        }

        // If not found by email, try phone
        if (!customer && phone) {
          customer = await Customer.findOne({ phone }).session(session);
        }

        if (customer) {
          // Customer exists - use existing customer
          console.log(`Found existing customer: ${customer.email}`);
          saleData.customer = customer._id;
        } else {
          // Customer doesn't exist - create new customer
          const newCustomer = new Customer({
            firstName: firstName || name?.split(" ")[0] || "Guest",
            lastName:
              lastName || name?.split(" ").slice(1).join(" ") || "Customer",
            email: email || `guest_${Date.now()}@offline.local`,
            phone: phone || "N/A",
            type: "individual",
            status: "active",
            isGuest: !email, // Mark as guest only if no email provided
            source: "offline_sale",
            createdBy: new mongoose.Types.ObjectId(userId),
          });

          await newCustomer.save({ session });
          console.log(`Created new customer: ${newCustomer.email}`);
          saleData.customer = newCustomer._id;
        }
      }

      // Set order type to offline
      saleData.type = "offline";
      saleData.paymentStatus = PaymentStatus.PAID;
      saleData.status = OrderStatus.DELIVERED;

      // Set payment details
      if (!saleData.paymentDetails) {
        saleData.paymentDetails = {};
      }
      saleData.paymentDetails.paidAt = new Date();
      saleData.paymentDetails.paidAmount = saleData.totalAmount;

      // Set delivery dates
      saleData.deliveredAt = new Date();
      saleData.actualDelivery = new Date();

      // Validate and process order items
      for (const item of saleData.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new AppError(`Product with ID ${item.product} not found`, 404);
        }

        // Check inventory
        if (
          product.inventory.trackInventory &&
          product.inventory.availableQuantity < item.quantity
        ) {
          throw new AppError(
            `Insufficient inventory for product ${product.name}. Available: ${product.inventory.availableQuantity}, Required: ${item.quantity}`,
            400
          );
        }

        // Update inventory immediately for offline sales
        await product.updateStock(item.quantity, "subtract");
        await product.incrementSalesCount(item.quantity);
        await product.save({ session });

        // Set product snapshot for order history
        item.productSnapshot = {
          name: product.name,
          sku: product.sku,
          price: item.price,
          category: product.category,
        };
      }

      // Create order without going through createOrder (to avoid double inventory updates)
      const order = new Order({
        ...saleData,
        createdBy: new mongoose.Types.ObjectId(userId),
        orderNumber: `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 5)
          .toUpperCase()}`,
        timeline: [
          {
            status: OrderStatus.DELIVERED,
            timestamp: new Date(),
            notes: "Offline sale recorded",
            updatedBy: new mongoose.Types.ObjectId(userId),
          },
        ],
      });

      await order.save({ session });

      // Update customer metrics if not guest
      if (saleData.customer) {
        const customer = await Customer.findById(saleData.customer).session(
          session
        );
        if (customer && !customer.isGuest) {
          await customer.updateMetrics();
        }
      }

      await session.commitTransaction();
      return order.populate("customer", "firstName lastName email phone");
    } catch (error: any) {
      await session.abortTransaction();
      throw new AppError(error.message || "Failed to record offline sale", 400);
    } finally {
      session.endSession();
    }
  }

  /**
   * Quick inventory update for sales admin
   */
  async quickInventoryUpdate(
    productId: string,
    quantity: number,
    operation: "add" | "subtract",
    userId: string,
    reason?: string
  ) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError("Product not found", 404);
      }

      const previousQuantity = product.inventory.availableQuantity;
      await product.updateStock(quantity, operation);
      product.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await product.save();

      // Log the inventory change
      const changeLog = {
        productId,
        productName: product.name,
        sku: product.sku,
        previousQuantity,
        newQuantity: product.inventory.availableQuantity,
        changeAmount: operation === "add" ? quantity : -quantity,
        operation,
        reason: reason || `Manual ${operation} by sales admin`,
        updatedBy: userId,
        timestamp: new Date(),
      };

      // You could store this in a separate InventoryLog model if needed
      console.log("Inventory Change:", changeLog);

      return {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          previousQuantity,
          newQuantity: product.inventory.availableQuantity,
          changeAmount: changeLog.changeAmount,
        },
        changeLog,
      };
    } catch (error: any) {
      throw new AppError(error.message || "Failed to update inventory", 400);
    }
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters: any = {}, pagination: any = {}) {
    try {
      const {
        search,
        status,
        paymentStatus,
        customer,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
      } = filters;

      const { page = 1, limit = 20, sort = "-createdAt" } = pagination;

      const query: any = {};

      // Apply filters
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          { "customerInfo.name": { $regex: search, $options: "i" } },
          { "customerInfo.email": { $regex: search, $options: "i" } },
        ];
      }

      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      if (customer) query.customer = customer;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (minAmount || maxAmount) {
        query.totalAmount = {};
        if (minAmount) query.totalAmount.$gte = minAmount;
        if (maxAmount) query.totalAmount.$lte = maxAmount;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate("customer", "firstName lastName email")
          .populate("items.product", "name sku")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error: any) {
      throw new AppError(error.message || "Failed to fetch orders", 400);
    }
  }

  // ============= CUSTOMER MANAGEMENT =============

  /**
   * Get customers with filters
   */
  async getCustomers(filters: any = {}, pagination: any = {}) {
    try {
      const { search, status, type, segment, loyaltyTier } = filters;

      const { page = 1, limit = 20, sort = "-createdAt" } = pagination;

      const query: any = {};

      // Apply filters
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (status) query.status = status;
      if (type) query.type = type;
      if (segment) query.segment = segment;
      if (loyaltyTier) query["loyaltyProgram.tier"] = loyaltyTier;

      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        Customer.find(query)
          .populate("user", "email role")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Customer.countDocuments(query),
      ]);

      return {
        customers,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error: any) {
      throw new AppError(error.message || "Failed to fetch customers", 400);
    }
  }

  /**
   * Get customer details with order history
   */
  async getCustomerDetails(customerId: string) {
    try {
      const customer = await Customer.findById(customerId).populate(
        "user",
        "email role lastLogin"
      );

      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      const orderHistory = await customer.getOrderHistory(10);

      return {
        customer,
        orderHistory,
      };
    } catch (error: any) {
      throw AppError.badRequest(
        error.message || "Failed to fetch customer details"
      );
    }
  }

  // ============= ANALYTICS =============

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(
    period: AnalyticsPeriod,
    startDate: Date,
    endDate: Date,
    userId: string
  ) {
    try {
      // Check if analytics already exist for this period
      const existingAnalytics = await Analytics.findOne({
        period,
        startDate,
        endDate,
      });

      // If not, generate new analytics
      const analytics =
        existingAnalytics ||
        (await Analytics.generateForPeriod(
          period,
          startDate,
          endDate,
          new mongoose.Types.ObjectId(userId)
        ));

      // Get previous period analytics for comparison
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(endDate);

      // Calculate previous period dates based on period type
      const timeDiff = endDate.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - timeDiff);
      previousEndDate.setTime(previousEndDate.getTime() - timeDiff);

      const previousAnalytics = await Analytics.findOne({
        period,
        startDate: previousStartDate,
        endDate: previousEndDate,
      });

      if (previousAnalytics) {
        analytics.calculateGrowthRate(previousAnalytics);
        await analytics.save();
      }

      return analytics.generateReport();
    } catch (error: any) {
      throw new AppError(error.message || "Failed to generate analytics", 400);
    }
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Today's stats
      const [todayOrders, todayRevenue] = await Promise.all([
        Order.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: today, $lt: tomorrow },
              paymentStatus: PaymentStatus.PAID,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

      // Month's stats
      const [monthOrders, monthRevenue] = await Promise.all([
        Order.countDocuments({
          createdAt: { $gte: thisMonth, $lt: nextMonth },
        }),
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: thisMonth, $lt: nextMonth },
              paymentStatus: PaymentStatus.PAID,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

      // Inventory alerts
      const lowStockCount = await Product.countDocuments({
        "inventory.trackInventory": true,
        $expr: {
          $lte: [
            "$inventory.availableQuantity",
            "$inventory.lowStockThreshold",
          ],
        },
      });

      // Pending orders
      const pendingOrders = await Order.countDocuments({
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      });

      // Total customers
      const totalCustomers = await Customer.countDocuments({
        status: "active",
      });

      // Total products
      const totalProducts = await Product.countDocuments({
        status: "active",
      });

      return {
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0,
        },
        month: {
          orders: monthOrders,
          revenue: monthRevenue[0]?.total || 0,
        },
        inventory: {
          lowStockAlerts: lowStockCount,
        },
        orders: {
          pending: pendingOrders,
        },
        totals: {
          customers: totalCustomers,
          products: totalProducts,
        },
      };
    } catch (error: any) {
      throw AppError.badRequest(
        error.message || "Failed to fetch dashboard stats"
      );
    }
  }

  /**
   * Get best selling products
   */
  async getBestSellingProducts(
    limit: number = 10,
    dateRange?: { from: Date; to: Date }
  ) {
    try {
      const match: any = {
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      };

      if (dateRange) {
        match.createdAt = {
          $gte: dateRange.from,
          $lte: dateRange.to,
        };
      }

      const products = await Order.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.productSnapshot.name" },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.total" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        {
          $project: {
            productId: "$_id",
            productName: 1,
            totalQuantity: 1,
            totalRevenue: 1,
            orderCount: 1,
            product: { $arrayElemAt: ["$productDetails", 0] },
          },
        },
      ]);

      return products;
    } catch (error: any) {
      throw AppError.badRequest(
        error.message || "Failed to fetch best selling products"
      );
    }
  }

  /**
   * Export orders to CSV
   */
  async exportOrders(filters: any = {}) {
    try {
      const orders = await Order.find(filters)
        .populate("customer", "firstName lastName email")
        .populate("items.product", "name sku")
        .lean();

      // Format for CSV export
      const csvData = orders.map((order) => ({
        "Order Number": order.orderNumber,
        Date: order.createdAt,
        Customer: order.customerInfo.name,
        Email: order.customerInfo.email,
        Total: order.totalAmount,
        Status: order.status,
        "Payment Status": order.paymentStatus,
        "Payment Method": order.paymentMethod,
        Items: order.items
          .map((item) => `${item.productSnapshot.name} (${item.quantity})`)
          .join(", "),
      }));

      return csvData;
    } catch (error: any) {
      throw new AppError(error.message || "Failed to export orders", 400);
    }
  }
}

export default new SalesAdminService();
