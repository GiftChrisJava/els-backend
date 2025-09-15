import {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  UserRole,
} from "@core/constants/role.constants";
import { AppError } from "@shared/errors/AppError";
import { logger } from "@shared/utils/logger.util";
import { NextFunction, Request, Response } from "express";

/**
 * Check if user has one of the specified roles
 */
export const hasRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required"));
    }

    const userRole = req.user.role as UserRole;

    if (!roles.includes(userRole)) {
      logger.warn(
        `Access denied for user ${
          req.user.email
        } with role ${userRole}. Required roles: ${roles.join(", ")}`
      );
      return next(AppError.forbidden("Insufficient role privileges"));
    }

    next();
  };
};

/**
 * Check if user has a minimum role level (hierarchical check)
 */
export const hasMinimumRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required"));
    }

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 999;

    if (userLevel < requiredLevel) {
      logger.warn(
        `Access denied for user ${req.user.email}. User level: ${userLevel}, Required level: ${requiredLevel}`
      );
      return next(AppError.forbidden("Insufficient role level"));
    }

    next();
  };
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required"));
    }

    const userRole = req.user.role as UserRole;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    const userPermissions = [
      ...rolePermissions,
      ...(req.user.permissions || []),
    ];

    const hasRequiredPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      logger.warn(
        `Permission denied for user ${
          req.user.email
        }. Required: ${permissions.join(", ")}`
      );
      return next(AppError.forbidden("Insufficient permissions"));
    }

    next();
  };
};

/**
 * Check if user is admin (any admin role)
 */
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized("Authentication required"));
  }

  const adminRoles = [
    UserRole.SYSTEM_ADMIN,
    UserRole.SALES_ADMIN,
    UserRole.WEB_ADMIN,
    UserRole.HELPDESK,
  ];

  const userRole = req.user.role as UserRole;

  if (!adminRoles.includes(userRole)) {
    logger.warn(
      `Admin access denied for user ${req.user.email} with role ${userRole}`
    );
    return next(AppError.forbidden("Admin access required"));
  }

  next();
};

/**
 * Check if user is system admin
 */
export const isSystemAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(AppError.unauthorized("Authentication required"));
  }

  if (req.user.role !== UserRole.SYSTEM_ADMIN) {
    logger.warn(
      `System admin access denied for user ${req.user.email} with role ${req.user.role}`
    );
    return next(AppError.forbidden("System admin access required"));
  }

  next();
};

/**
 * Check if user can access resource (owner or admin)
 */
export const canAccessResource = (ownerIdField: string = "userId") => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required"));
    }

    // System admins can access everything
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      return next();
    }

    // Check if user is the owner
    const resourceOwnerId = req.params[ownerIdField] || req.body[ownerIdField];

    if (
      resourceOwnerId &&
      resourceOwnerId.toString() === req.user._id.toString()
    ) {
      return next();
    }

    // Check if user has admin role
    const adminRoles = [UserRole.SALES_ADMIN, UserRole.WEB_ADMIN];

    if (adminRoles.includes(req.user.role as UserRole)) {
      return next();
    }

    logger.warn(`Resource access denied for user ${req.user.email}`);
    return next(
      AppError.forbidden("You do not have permission to access this resource")
    );
  };
};
