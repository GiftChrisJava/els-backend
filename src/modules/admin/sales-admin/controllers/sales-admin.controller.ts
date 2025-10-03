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
   */
  async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { period, startDate, endDate } = req.query;

      if (!period || !startDate || !endDate) {
        throw new AppError("Period, start date and end date are required", 400);
      }

      const analytics = await salesAdminService.getSalesAnalytics(
        period as AnalyticsPeriod,
        new Date(startDate as string),
        new Date(endDate as string),
        req.user?.id
      );

      res.status(200).json({
        success: true,
        data: analytics,
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
}

export default new SalesAdminController();
