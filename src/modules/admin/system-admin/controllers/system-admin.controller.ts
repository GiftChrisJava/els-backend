import { AppError } from "@shared/errors/AppError";
import { asyncHandler } from "@shared/utils/async-handler.util";
import { ResponseUtil } from "@shared/utils/response.util";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { SystemAdminService } from "../services/system-admin.service";

export class SystemAdminController {
  private systemAdminService: SystemAdminService;

  constructor() {
    this.systemAdminService = new SystemAdminService();
  }

  createAdmin = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const creatorId = req.user?._id;

      if (!creatorId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const newAdmin = await this.systemAdminService.createAdmin(
        creatorId as mongoose.Types.ObjectId,
        req.body
      );

      ResponseUtil.created(
        res,
        {
          admin: {
            id: newAdmin._id,
            email: newAdmin.email,
            firstName: newAdmin.firstName,
            lastName: newAdmin.lastName,
            role: newAdmin.role,
            status: newAdmin.status,
          },
        },
        "Admin created successfully"
      );
    }
  );

  updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const updatedUser = await this.systemAdminService.updateUser(
        adminId as mongoose.Types.ObjectId,
        userId,
        req.body
      );

      ResponseUtil.success(
        res,
        {
          user: {
            id: updatedUser._id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            status: updatedUser.status,
            permissions: updatedUser.permissions,
          },
        },
        "User updated successfully"
      );
    }
  );

  deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.systemAdminService.deleteUser(
        adminId as mongoose.Types.ObjectId,
        userId
      );

      ResponseUtil.success(res, null, "User deleted successfully");
    }
  );

  suspendUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      if (!reason) {
        throw AppError.badRequest("Suspension reason is required");
      }

      const user = await this.systemAdminService.suspendUser(
        adminId as mongoose.Types.ObjectId,
        userId,
        reason
      );

      ResponseUtil.success(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            status: user.status,
          },
        },
        "User suspended successfully"
      );
    }
  );

  activateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const user = await this.systemAdminService.activateUser(
        adminId as mongoose.Types.ObjectId,
        userId
      );

      ResponseUtil.success(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            status: user.status,
          },
        },
        "User activated successfully"
      );
    }
  );

  getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { role, status, search, page, limit, sortBy, sortOrder } =
        req.query;

      const result = await this.systemAdminService.getAllUsers(
        {
          role: role as any,
          status: status as any,
          search: search as string,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.users,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Users retrieved successfully"
      );
    }
  );

  getDashboardStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const stats = await this.systemAdminService.getDashboardStats(
        adminId as mongoose.Types.ObjectId
      );

      ResponseUtil.success(
        res,
        stats,
        "Dashboard statistics retrieved successfully"
      );
    }
  );

  getActivityLogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        userId,
        type,
        severity,
        module,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const result = await this.systemAdminService.getActivityLogs(
        {
          userId: userId as string,
          type: type as any,
          severity: severity as any,
          module: module as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        }
      );

      ResponseUtil.paginated(
        res,
        result.logs,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Activity logs retrieved successfully"
      );
    }
  );

  getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId } = req.params;

      const user = await this.systemAdminService.getUserById(userId);

      if (!user) {
        throw AppError.notFound("User not found");
      }

      ResponseUtil.success(res, { user }, "User retrieved successfully");
    }
  );

  changeUserRole = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userId } = req.params;
      const { role } = req.body;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      if (!role) {
        throw AppError.badRequest("New role is required");
      }

      const user = await this.systemAdminService.changeUserRole(
        adminId as mongoose.Types.ObjectId,
        userId,
        role
      );

      ResponseUtil.success(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
          },
        },
        "User role changed successfully"
      );
    }
  );

  bulkUpdateUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { userIds, updates } = req.body;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw AppError.badRequest("User IDs array is required");
      }

      const result = await this.systemAdminService.bulkUpdateUsers(
        adminId as mongoose.Types.ObjectId,
        userIds,
        updates
      );

      ResponseUtil.success(res, result, "Bulk update completed");
    }
  );

  exportUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { format = "csv", ...filters } = req.query;

      const data = await this.systemAdminService.exportUsers(
        filters,
        format as "csv" | "json"
      );

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=users.csv");
        res.send(data);
      } else {
        res.json(data);
      }
    }
  );

  getSystemHealth = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const health = await this.systemAdminService.getSystemHealth();

      ResponseUtil.success(res, health, "System health status retrieved");
    }
  );
}
