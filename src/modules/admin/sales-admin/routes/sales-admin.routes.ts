import { Router } from "express";
import { UserRole } from "../../../../core/constants/role.constants";
import { authenticate } from "../../../../modules/auth/middlewares/auth.middleware";
import { hasRole } from "../../../../modules/auth/middlewares/role.middleware";
import {
  uploadCategoryImage,
  uploadProductImages,
} from "../../../../shared/middlewares/upload.middleware";
import salesAdminController from "../controllers/sales-admin.controller";
import {
  validateBulkUpdateInventory,
  validateCreateCategory,
  validateCreateOrder,
  validateCreateProduct,
  validateRecordOfflineSale,
  validateUpdateInventory,
  validateUpdateOrderStatus,
  validateUpdateProduct,
} from "../validators/sales-admin.validator";

const router = Router();

// All routes require authentication and sales-admin or system-admin role
router.use(authenticate);
router.use(hasRole(UserRole.SALES_ADMIN, UserRole.SYSTEM_ADMIN));

// ============= PRODUCT ROUTES =============
router.post(
  "/products",
  uploadProductImages,
  validateCreateProduct,
  salesAdminController.createProduct
);
router.get("/products", salesAdminController.getProducts);
router.get("/products/:id", salesAdminController.getProduct);
router.put(
  "/products/:id",
  uploadProductImages,
  validateUpdateProduct,
  salesAdminController.updateProduct
);
router.delete("/products/:id", salesAdminController.deleteProduct);
router.patch(
  "/products/:id/inventory",
  validateUpdateInventory,
  salesAdminController.updateInventory
);
router.patch(
  "/products/:productId/inventory/quick",
  validateUpdateInventory,
  salesAdminController.quickInventoryUpdate
);
router.post(
  "/products/inventory/bulk",
  validateBulkUpdateInventory,
  salesAdminController.bulkUpdateInventory
);

// ============= CATEGORY ROUTES =============
router.post(
  "/categories",
  uploadCategoryImage,
  validateCreateCategory,
  salesAdminController.createCategory
);
router.get("/categories/tree", salesAdminController.getCategoryTree);

// ============= ORDER ROUTES =============
router.post("/orders", validateCreateOrder, salesAdminController.createOrder);
router.get("/orders", salesAdminController.getOrders);
router.get("/orders/export", salesAdminController.exportOrders);
router.get("/orders/:id", salesAdminController.getOrder);
router.patch(
  "/orders/:id/status",
  validateUpdateOrderStatus,
  salesAdminController.updateOrderStatus
);
router.post(
  "/orders/offline",
  validateRecordOfflineSale,
  salesAdminController.recordOfflineSale
);

// ============= CUSTOMER ROUTES =============
router.get("/customers", salesAdminController.getCustomers);
router.get("/customers/:id", salesAdminController.getCustomerDetails);

// ============= ANALYTICS ROUTES =============
router.get("/analytics", salesAdminController.getSalesAnalytics);
router.get("/analytics/dashboard", salesAdminController.getDashboardStats);
router.get(
  "/analytics/best-sellers",
  salesAdminController.getBestSellingProducts
);

export default router;
