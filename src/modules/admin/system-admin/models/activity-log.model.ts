import mongoose, { Document, Schema } from "mongoose";

export enum ActivityType {
  // User Management
  USER_CREATED = "user-created",
  USER_UPDATED = "user-updated",
  USER_DELETED = "user-deleted",
  USER_SUSPENDED = "user-suspended",
  USER_ACTIVATED = "user-activated",
  USER_ROLE_CHANGED = "user-role-changed",
  USER_PERMISSION_UPDATED = "user-permission-updated",

  // Authentication
  USER_LOGIN = "user-login",
  USER_LOGOUT = "user-logout",
  USER_LOGIN_FAILED = "user-login-failed",
  PASSWORD_CHANGED = "password-changed",
  PASSWORD_RESET = "password-reset",

  // Admin Actions
  ADMIN_CREATED = "admin-created",
  ADMIN_DELETED = "admin-deleted",
  ADMIN_PERMISSION_CHANGED = "admin-permission-changed",

  // System
  SYSTEM_SETTING_CHANGED = "system-setting-changed",
  DATABASE_BACKUP = "database-backup",
  DATABASE_RESTORE = "database-restore",
  BULK_OPERATION = "bulk-operation",

  // Security
  SECURITY_ALERT = "security-alert",
  SUSPICIOUS_ACTIVITY = "suspicious-activity",
  ACCESS_DENIED = "access-denied",
  RATE_LIMIT_EXCEEDED = "rate-limit-exceeded",
}

export enum ActivitySeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export interface IActivityLog extends Document {
  type: ActivityType;
  severity: ActivitySeverity;
  userId?: mongoose.Types.ObjectId;
  targetUserId?: mongoose.Types.ObjectId;
  description: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  module: string;
  action: string;
  statusCode?: number;
  duration?: number;
  metadata?: {
    before?: any;
    after?: any;
    changes?: any;
    reason?: string;
  };
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    type: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(ActivitySeverity),
      default: ActivitySeverity.INFO,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    module: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
    },
    duration: {
      type: Number, // in milliseconds
    },
    metadata: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      changes: Schema.Types.Mixed,
      reason: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "activity_logs",
  }
);

// Indexes for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });

// TTL index to automatically delete old logs after 90 days
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Static methods
activityLogSchema.statics.logActivity = async function (
  data: Partial<IActivityLog>
): Promise<IActivityLog> {
  return await this.create(data);
};

activityLogSchema.statics.logUserActivity = async function (
  userId: mongoose.Types.ObjectId,
  type: ActivityType,
  description: string,
  details?: any
): Promise<IActivityLog> {
  return await this.create({
    userId,
    type,
    description,
    details,
    severity: ActivitySeverity.INFO,
    module: "system",
    action: type,
  });
};

activityLogSchema.statics.logSecurityEvent = async function (
  type: ActivityType,
  description: string,
  severity: ActivitySeverity,
  details?: any
): Promise<IActivityLog> {
  return await this.create({
    type,
    description,
    severity,
    details,
    module: "security",
    action: type,
  });
};

export const ActivityLog = mongoose.model<IActivityLog>(
  "ActivityLog",
  activityLogSchema
);
