import { NextFunction, Request, Response } from "express";
import { Parser } from "json2csv";
import { AppError } from "../../../../shared/errors/AppError";
import { AppwriteService } from "../../../../shared/services/appwrite.service";
import { AnalyticsPeriod } from "../../sales-admin/models/analytics.model";
import { OrderStatus } from "../models/order.model";
import salesAdminService from "../services/sales-admin.service";

const appwriteService = new AppwriteService();

export class SalesAdminController {
  // ============= PRODUCT CONTROLLERS =============

  /**
   * Create new product
   */
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      // Process uploaded files and upload to Appwrite
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        // Upload featured image to Appwrite if provided
        if (
          files.featuredImage &&
          files.featuredImage.length > 0 &&
          files.featuredImage[0]
        ) {
          const featuredImageUrl = await appwriteService.uploadImage(
            files.featuredImage[0],
            "products"
          );
          req.body.featuredImage = featuredImageUrl;
        }

        // Upload gallery images to Appwrite if provided
        if (files.images && files.images.length > 0) {
          const imageUrls = await appwriteService.uploadMultipleImages(
            files.images,
            "products/gallery"
          );
          req.body.images = imageUrls;
        }
      }

      const product = await salesAdminService.createProduct(
        req.body,
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all products
   */
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, sort, ...filters } = req.query;

      const result = await salesAdminService.getProducts(filters, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sort,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single product
   */
  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await salesAdminService.getProducts(
        { _id: id },
        { limit: 1 }
      );

      if (!product.products.length) {
        throw new AppError("Product not found", 404);
      }

      res.status(200).json({
        success: true,
        data: product.products[0],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   */
  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Process uploaded files and upload to Appwrite
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        // Upload featured image to Appwrite if provided
        if (
          files.featuredImage &&
          files.featuredImage.length > 0 &&
          files.featuredImage[0]
        ) {
          const featuredImageUrl = await appwriteService.uploadImage(
            files.featuredImage[0],
            "products"
          );
          req.body.featuredImage = featuredImageUrl;
        }

        // Upload gallery images to Appwrite if provided
        if (files.images && files.images.length > 0) {
          const imageUrls = await appwriteService.uploadMultipleImages(
            files.images,
            "products/gallery"
          );
          req.body.images = imageUrls;
        }
      }

      const product = await salesAdminService.updateProduct(
        id,
        req.body,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await salesAdminService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, operation } = req.body;

      const product = await salesAdminService.updateInventory(
        id,
        quantity,
        operation,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick inventory update (for manual sales/adjustments)
   */
  async quickInventoryUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const { quantity, operation, reason } = req.body;

      const result = await salesAdminService.quickInventoryUpdate(
        productId,
        quantity,
        operation,
        req.user?.id,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Inventory ${
          operation === "add" ? "increased" : "decreased"
        } successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;

      const results = await salesAdminService.bulkUpdateInventory(
        updates,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= CATEGORY CONTROLLERS =============

  /**
   * Create category
   */
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      // Process uploaded files and upload to Appwrite
      if (req.files) {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        // Upload category image to Appwrite if provided
        if (files.image && files.image.length > 0 && files.image[0]) {
          const imageUrl = await appwriteService.uploadImage(
            files.image[0],
            "categories"
          );
          req.body.image = imageUrl;
        }

        // Upload category icon to Appwrite if provided
        if (files.icon && files.icon.length > 0 && files.icon[0]) {
          const iconUrl = await appwriteService.uploadImage(
            files.icon[0],
            "categories/icons"
          );
          req.body.icon = iconUrl;
        }
      }

      const category = await salesAdminService.createCategory(
        req.body,
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category tree
   */
  async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await salesAdminService.getCategoryTree();

      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= ORDER CONTROLLERS =============

  /**
   * Create new order
   */
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await salesAdminService.createOrder(req.body, req.user?.id);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders
   */
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, sort, ...filters } = req.query;

      const result = await salesAdminService.getOrders(filters, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sort,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single order
   */
  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const orders = await salesAdminService.getOrders(
        { _id: id },
        { limit: 1 }
      );

      if (!orders.orders.length) {
        throw new AppError("Order not found", 404);
      }

      res.status(200).json({
        success: true,
        data: orders.orders[0],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await salesAdminService.updateOrderStatus(
        id,
        status as OrderStatus,
        req.user?.id,
        notes
      );

      res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record offline sale
   */
  async recordOfflineSale(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await salesAdminService.recordOfflineSale(
        req.body,
        req.user?.id
      );

      res.status(201).json({
        success: true,
        message: "Offline sale recorded successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export orders to CSV
   */
  async exportOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { ...filters } = req.query;

      const data = await salesAdminService.exportOrders(filters);

      if (data.length === 0) {
        throw new AppError("No orders found to export", 404);
      }

      const parser = new Parser();
      const csv = parser.parse(data);

      res.header("Content-Type", "text/csv");
      res.header("Content-Disposition", 'attachment; filename="orders.csv"');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  // ============= CUSTOMER CONTROLLERS =============

  /**
   * Get all customers
   */
  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, sort, ...filters } = req.query;

      const result = await salesAdminService.getCustomers(filters, {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sort,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer details
   */
  async getCustomerDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await salesAdminService.getCustomerDetails(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= ANALYTICS CONTROLLERS =============

  /**
   * Get sales analytics
   * Supports multiple query formats:
   * 1. period, startDate, endDate - Flexible date range
   * 2. month, year - Specific month (e.g., month=10, year=2025)
   * 3. year - Entire year (e.g., year=2025)
   * 4. No params - Current month
   */
  async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { period, startDate, endDate, month, year } = req.query;

      let start: Date;
      let end: Date;
      let analyticsPeriod: AnalyticsPeriod =
        (period as AnalyticsPeriod) || AnalyticsPeriod.MONTHLY;

      // Case 1: Query by month and year (e.g., month=10, year=2025)
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);

        if (monthNum < 1 || monthNum > 12) {
          throw new AppError("Month must be between 1 and 12", 400);
        }

        start = new Date(yearNum, monthNum - 1, 1); // First day of month
        end = new Date(yearNum, monthNum, 0, 23, 59, 59); // Last day of month
        analyticsPeriod = AnalyticsPeriod.MONTHLY;
      }
      // Case 2: Query by year only (e.g., year=2025)
      else if (year && !month) {
        const yearNum = parseInt(year as string);
        start = new Date(yearNum, 0, 1); // January 1st
        end = new Date(yearNum, 11, 31, 23, 59, 59); // December 31st
        analyticsPeriod = AnalyticsPeriod.YEARLY;
      }
      // Case 3: Query by startDate and endDate
      else if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      }
      // Case 4: No params - use current month
      else {
        const today = new Date();
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        analyticsPeriod = AnalyticsPeriod.MONTHLY;
      }

      const analytics = await salesAdminService.getSalesAnalytics(
        analyticsPeriod,
        start,
        end,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        data: analytics,
        meta: {
          period: analyticsPeriod,
          startDate: start,
          endDate: end,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await salesAdminService.getDashboardStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get best selling products
   */
  async getBestSellingProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { limit, dateFrom, dateTo } = req.query;

      let dateRange;
      if (dateFrom && dateTo) {
        dateRange = {
          from: new Date(dateFrom as string),
          to: new Date(dateTo as string),
        };
      }

      const products = await salesAdminService.getBestSellingProducts(
        Number(limit) || 10,
        dateRange
      );

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============= CATEGORY MANAGEMENT =============
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.params;
      const adminId = req.user!._id.toString();
      const updateData = req.body;

      const category = await salesAdminService.updateCategory(
        categoryId,
        updateData,
        adminId
      );

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.params;
      const adminId = req.user!._id.toString();

      await salesAdminService.deleteCategory(categoryId, adminId);

      res.status(200).json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SalesAdminController();
