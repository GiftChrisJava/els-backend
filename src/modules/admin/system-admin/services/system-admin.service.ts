import { ROLE_HIERARCHY, UserRole } from "@core/constants/role.constants";
import { UserStatus } from "@core/constants/status.constants";
import { IUser, User } from "@modules/auth/models/user.model";
import { AppError } from "@shared/errors/AppError";
import { EmailUtil } from "@shared/utils/email.util";
import { logger } from "@shared/utils/logger.util";
import mongoose from "mongoose";
import {
  ActivityLog,
  ActivitySeverity,
  ActivityType,
} from "../models/activity-log.model";

export interface CreateAdminDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  company?: string;
  permissions?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  company?: string;
  status?: UserStatus;
  role?: UserRole;
  permissions?: string[];
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalAdmins: number;
  activeUsers: number;
  pendingVerifications: number;
  suspendedUsers: number;
  usersByRole: { role: string; count: number }[];
  recentActivities: any[];
  systemHealth: {
    database: boolean;
    email: boolean;
    storage: boolean;
  };
}

export class SystemAdminService {
  private emailUtil: EmailUtil;

  constructor() {
    this.emailUtil = new EmailUtil();
  }

  async createAdmin(
    creatorId: mongoose.Types.ObjectId,
    dto: CreateAdminDto
  ): Promise<IUser> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if creator has permission to create this role
      const creator = await User.findById(creatorId);
      if (!creator) {
        throw AppError.notFound("Creator not found");
      }

      // System admin can create any role
      // Other admins can only create roles below their level
      if (creator.role !== UserRole.SYSTEM_ADMIN) {
        const creatorLevel = ROLE_HIERARCHY[creator.role];
        const newRoleLevel = ROLE_HIERARCHY[dto.role];

        if (newRoleLevel >= creatorLevel) {
          throw AppError.forbidden(
            "Cannot create admin with equal or higher role level"
          );
        }
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: dto.email });
      if (existingUser) {
        throw AppError.conflict("User with this email already exists");
      }

      // Create new admin user
      const newAdmin = new User({
        ...dto,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        createdBy: creatorId,
      });

      await newAdmin.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.ADMIN_CREATED,
            severity: ActivitySeverity.INFO,
            userId: creatorId,
            targetUserId: newAdmin._id,
            description: `Admin created: ${newAdmin.email} with role ${newAdmin.role}`,
            module: "system-admin",
            action: "create-admin",
            metadata: {
              createdAdmin: {
                id: newAdmin._id,
                email: newAdmin.email,
                role: newAdmin.role,
              },
            },
          },
        ],
        { session }
      );

      // Send welcome email to new admin
      await this.emailUtil.sendAdminWelcomeEmail(
        newAdmin.email,
        newAdmin.firstName,
        dto.password,
        newAdmin.role
      );

      await session.commitTransaction();

      logger.info(`New admin created: ${newAdmin.email} by ${creator.email}`);

      return newAdmin;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateUser(
    adminId: mongoose.Types.ObjectId,
    userId: string,
    dto: UpdateUserDto
  ): Promise<IUser> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admin = await User.findById(adminId);
      if (!admin) {
        throw AppError.notFound("Admin not found");
      }

      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Check permission to update this user
      if (admin.role !== UserRole.SYSTEM_ADMIN) {
        const adminLevel = ROLE_HIERARCHY[admin.role];
        const userLevel = ROLE_HIERARCHY[user.role];

        if (userLevel >= adminLevel) {
          throw AppError.forbidden(
            "Cannot update user with equal or higher role level"
          );
        }

        // Check if trying to elevate role beyond admin's level
        if (dto.role) {
          const newRoleLevel = ROLE_HIERARCHY[dto.role];
          if (newRoleLevel >= adminLevel) {
            throw AppError.forbidden(
              "Cannot assign role equal or higher than your own"
            );
          }
        }
      }

      // Store original values for activity log
      const originalValues = {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        company: user.company,
        status: user.status,
        role: user.role,
        permissions: user.permissions,
      };

      // Update user fields
      Object.assign(user, dto);
      user.lastModifiedBy = adminId;

      await user.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.USER_UPDATED,
            severity: ActivitySeverity.INFO,
            userId: adminId,
            targetUserId: user._id,
            description: `User updated: ${user.email}`,
            module: "system-admin",
            action: "update-user",
            metadata: {
              before: originalValues,
              after: dto,
              changes: Object.keys(dto),
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(`User ${user.email} updated by ${admin.email}`);

      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteUser(
    adminId: mongoose.Types.ObjectId,
    userId: string
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admin = await User.findById(adminId);
      if (!admin) {
        throw AppError.notFound("Admin not found");
      }

      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Prevent self-deletion
      if (adminId.toString() === userId) {
        throw AppError.badRequest("Cannot delete your own account");
      }

      // Check permission
      if (admin.role !== UserRole.SYSTEM_ADMIN) {
        const adminLevel = ROLE_HIERARCHY[admin.role];
        const userLevel = ROLE_HIERARCHY[user.role];

        if (userLevel >= adminLevel) {
          throw AppError.forbidden(
            "Cannot delete user with equal or higher role level"
          );
        }
      }

      // Soft delete
      user.status = UserStatus.DELETED;
      user.deletedAt = new Date();
      user.lastModifiedBy = adminId;

      await user.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.USER_DELETED,
            severity: ActivitySeverity.WARNING,
            userId: adminId,
            targetUserId: user._id,
            description: `User deleted: ${user.email}`,
            module: "system-admin",
            action: "delete-user",
            metadata: {
              deletedUser: {
                id: user._id,
                email: user.email,
                role: user.role,
              },
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.warn(`User ${user.email} deleted by ${admin.email}`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async suspendUser(
    adminId: mongoose.Types.ObjectId,
    userId: string,
    reason: string
  ): Promise<IUser> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      user.status = UserStatus.SUSPENDED;
      user.lastModifiedBy = adminId;

      await user.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.USER_SUSPENDED,
            severity: ActivitySeverity.WARNING,
            userId: adminId,
            targetUserId: user._id,
            description: `User suspended: ${user.email}`,
            module: "system-admin",
            action: "suspend-user",
            metadata: { reason },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.warn(`User ${user.email} suspended. Reason: ${reason}`);

      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async activateUser(
    adminId: mongoose.Types.ObjectId,
    userId: string
  ): Promise<IUser> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      user.status = UserStatus.ACTIVE;
      user.emailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user.lastModifiedBy = adminId;

      await user.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.USER_ACTIVATED,
            severity: ActivitySeverity.INFO,
            userId: adminId,
            targetUserId: user._id,
            description: `User activated: ${user.email}`,
            module: "system-admin",
            action: "activate-user",
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(`User ${user.email} activated`);

      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getAllUsers(
    filters?: {
      role?: UserRole;
      status?: UserStatus;
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "createdAt";
    const sortOrder = pagination?.sortOrder || "desc";

    const query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: "i" } },
        { firstName: { $regex: filters.search, $options: "i" } },
        { lastName: { $regex: filters.search, $options: "i" } },
        { company: { $regex: filters.search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats(
    adminId: mongoose.Types.ObjectId
  ): Promise<AdminDashboardStats> {
    const [
      totalUsers,
      totalAdmins,
      activeUsers,
      pendingVerifications,
      suspendedUsers,
      usersByRole,
      recentActivities,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: { $ne: UserRole.CUSTOMER } }),
      User.countDocuments({ status: UserStatus.ACTIVE }),
      User.countDocuments({ status: UserStatus.PENDING_VERIFICATION }),
      User.countDocuments({ status: UserStatus.SUSPENDED }),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $project: { role: "$_id", count: 1, _id: 0 } },
      ]),
      ActivityLog.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "firstName lastName email")
        .populate("targetUserId", "firstName lastName email"),
    ]);

    return {
      totalUsers,
      totalAdmins,
      activeUsers,
      pendingVerifications,
      suspendedUsers,
      usersByRole,
      recentActivities,
      systemHealth: {
        database: true, // Check actual database connection
        email: true, // Check email service status
        storage: true, // Check storage service status
      },
    };
  }

  async getActivityLogs(
    filters?: {
      userId?: string;
      type?: ActivityType;
      severity?: ActivitySeverity;
      module?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const query: any = {};

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.severity) {
      query.severity = filters.severity;
    }

    if (filters?.module) {
      query.module = filters.module;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate("userId", "firstName lastName email")
      .populate("targetUserId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId)
        .select("-password")
        .populate("createdBy", "firstName lastName email")
        .populate("lastModifiedBy", "firstName lastName email");

      return user;
    } catch (error) {
      logger.error("Error fetching user by ID:", error);
      throw error;
    }
  }

  async changeUserRole(
    adminId: mongoose.Types.ObjectId,
    userId: string,
    newRole: UserRole
  ): Promise<IUser> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admin = await User.findById(adminId);
      if (!admin) {
        throw AppError.notFound("Admin not found");
      }

      const user = await User.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Check permission
      if (admin.role !== UserRole.SYSTEM_ADMIN) {
        const adminLevel = ROLE_HIERARCHY[admin.role];
        const newRoleLevel = ROLE_HIERARCHY[newRole];

        if (newRoleLevel >= adminLevel) {
          throw AppError.forbidden(
            "Cannot assign role equal or higher than your own"
          );
        }
      }

      const oldRole = user.role;
      user.role = newRole;
      user.lastModifiedBy = adminId;

      await user.save({ session });

      // Log activity
      await ActivityLog.create(
        [
          {
            type: ActivityType.USER_ROLE_CHANGED,
            severity: ActivitySeverity.WARNING,
            userId: adminId,
            targetUserId: user._id,
            description: `User role changed from ${oldRole} to ${newRole}`,
            module: "system-admin",
            action: "change-role",
            metadata: {
              before: { role: oldRole },
              after: { role: newRole },
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(
        `User ${user.email} role changed from ${oldRole} to ${newRole}`
      );

      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async bulkUpdateUsers(
    adminId: mongoose.Types.ObjectId,
    userIds: string[],
    updates: Partial<UpdateUserDto>
  ): Promise<{ updated: number; failed: number; errors: any[] }> {
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const userId of userIds) {
      try {
        await this.updateUser(adminId, userId, updates);
        results.updated++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId,
          error: error.message,
        });
      }
    }

    return results;
  }

  async exportUsers(filters: any, format: "csv" | "json"): Promise<any> {
    const users = await User.find(filters).select("-password");

    if (format === "json") {
      return users;
    }

    // Convert to CSV
    const csv = this.convertToCSV(users);
    return csv;
  }

  async getSystemHealth(): Promise<any> {
    const health = {
      database: false,
      email: false,
      storage: false,
      redis: false,
    };

    // Check database
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        health.database = true;
      }
    } catch (error) {
      logger.error("Database health check failed:", error);
    }

    // Check email service
    try {
      const emailUtil = new EmailUtil();
      // Implement email service health check
      health.email = true;
    } catch (error) {
      logger.error("Email health check failed:", error);
    }

    // Add more health checks as needed

    return health;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0].toObject());
    const csvHeaders = headers.join(",");

    const csvRows = data.map((item) => {
      const obj = item.toObject();
      return headers
        .map((header) => {
          const value = obj[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  }
}
