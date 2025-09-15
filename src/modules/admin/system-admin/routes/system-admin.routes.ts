import { UserRole } from "@core/constants/role.constants";
import { authenticate } from "@modules/auth/middlewares/auth.middleware";
import {
  hasMinimumRole,
  isSystemAdmin,
} from "@modules/auth/middlewares/role.middleware";
import { validateRequest } from "@shared/middlewares/validation.middleware";
import { Router } from "express";
import { SystemAdminController } from "../controllers/system-admin.controller";
import * as validators from "../validators/system-admin.validator";

const router = Router();
const systemAdminController = new SystemAdminController();

// All routes require authentication and system admin role by default
router.use(authenticate);

// Dashboard and statistics
router.get(
  "/dashboard",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.getDashboardStats
);

router.get("/health", isSystemAdmin, systemAdminController.getSystemHealth);

// User management
router.get(
  "/users",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.getAllUsers
);

router.get(
  "/users/:userId",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.getUserById
);

router.post(
  "/users",
  hasMinimumRole(UserRole.SALES_ADMIN),
  validateRequest(validators.createAdminSchema),
  systemAdminController.createAdmin
);

router.patch(
  "/users/:userId",
  hasMinimumRole(UserRole.SALES_ADMIN),
  validateRequest(validators.updateUserSchema),
  systemAdminController.updateUser
);

router.delete(
  "/users/:userId",
  isSystemAdmin,
  systemAdminController.deleteUser
);

// User status management
router.post(
  "/users/:userId/suspend",
  hasMinimumRole(UserRole.SALES_ADMIN),
  validateRequest(validators.suspendUserSchema),
  systemAdminController.suspendUser
);

router.post(
  "/users/:userId/activate",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.activateUser
);

router.patch(
  "/users/:userId/role",
  isSystemAdmin,
  validateRequest(validators.changeRoleSchema),
  systemAdminController.changeUserRole
);

// Bulk operations
router.post(
  "/users/bulk-update",
  isSystemAdmin,
  validateRequest(validators.bulkUpdateSchema),
  systemAdminController.bulkUpdateUsers
);

// Export
router.get(
  "/users/export",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.exportUsers
);

// Activity logs
router.get(
  "/activity-logs",
  hasMinimumRole(UserRole.SALES_ADMIN),
  systemAdminController.getActivityLogs
);

export default router;
