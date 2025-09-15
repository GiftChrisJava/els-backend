import mongoose from "mongoose";
import { UserRole } from "../../../core/constants/role.constants";
import { UserStatus } from "../../../core/constants/status.constants";
import { AppError } from "../../../shared/errors/AppError";
import { logger } from "../../../shared/utils/logger.util";
import { Session } from "../models/session.model";
import { IUser, User } from "../models/user.model";
import { Verification, VerificationType } from "../models/verification.model";
import { TokenService } from "./token.service";
import { VerificationService } from "./verification.service";

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  company?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface VerifyEmailDto {
  code: string;
  email?: string;
}

export interface ResetPasswordDto {
  code: string;
  email: string;
  newPassword: string;
}

export class AuthService {
  private tokenService: TokenService;
  private verificationService: VerificationService;

  constructor() {
    this.tokenService = new TokenService();
    this.verificationService = new VerificationService();
  }

  async register(dto: RegisterDto): Promise<{ user: IUser; message: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: dto.email });
      if (existingUser) {
        throw AppError.conflict("User with this email already exists");
      }

      // Create new user
      const user = new User({
        ...dto,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      });

      await user.save({ session });

      // Generate and send verification code
      await this.verificationService.sendVerificationCode(
        user._id as mongoose.Types.ObjectId,
        user.email,
        VerificationType.EMAIL_VERIFICATION
      );

      await session.commitTransaction();

      logger.info(`New user registered: ${user.email}`);

      return {
        user,
        message:
          "Registration successful. Please check your email for the verification code.",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async verifyEmail(
    dto: VerifyEmailDto
  ): Promise<{ user: IUser; tokens: any }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find and validate verification
      const verification = await Verification.findValidVerification(
        dto.code,
        VerificationType.EMAIL_VERIFICATION
      );

      if (!verification) {
        throw AppError.badRequest("Invalid or expired verification code");
      }

      // Increment attempts
      await verification.incrementAttempts();

      // Get user
      const user = await User.findById(verification.userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Verify email matches if provided
      if (dto.email && user.email !== dto.email.toLowerCase()) {
        throw AppError.badRequest("Email mismatch");
      }

      // Update user status
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.status = UserStatus.ACTIVE;
      await user.save({ session });

      // Mark verification as used
      await verification.markAsVerified();

      // Generate tokens
      const tokens = await this.tokenService.generateTokens(user);

      // Create session
      await Session.createSession(
        user._id as mongoose.Types.ObjectId,
        tokens.accessToken,
        tokens.refreshToken
      );

      await session.commitTransaction();

      logger.info(`Email verified for user: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async login(dto: LoginDto): Promise<{ user: IUser; tokens: any }> {
    try {
      // Find user with password field
      const user = await User.findOne({ email: dto.email }).select("+password");

      if (!user) {
        // Log failed attempt
        logger.warn(
          `Failed login attempt for non-existent email: ${dto.email}`
        );
        throw AppError.unauthorized("Invalid email or password");
      }

      // Check password
      const isPasswordValid = await user.comparePassword(dto.password);

      if (!isPasswordValid) {
        // Update failed login attempts
        user.metadata = user.metadata || {};
        user.metadata.failedLoginAttempts =
          (user.metadata.failedLoginAttempts || 0) + 1;
        user.metadata.lastFailedLogin = new Date();
        await user.save();

        logger.warn(`Failed login attempt for user: ${user.email}`);
        throw AppError.unauthorized("Invalid email or password");
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw AppError.forbidden("Please verify your email before logging in");
      }

      // Check if account is active
      if (user.status !== UserStatus.ACTIVE) {
        throw AppError.forbidden(
          `Your account is ${user.status}. Please contact support.`
        );
      }

      // Reset failed attempts and update metadata
      user.metadata = user.metadata || {};
      user.metadata.lastLogin = new Date();
      user.metadata.loginCount = (user.metadata.loginCount || 0) + 1;
      user.metadata.failedLoginAttempts = 0;
      user.metadata.ipAddress = dto.ipAddress;
      user.metadata.userAgent = dto.userAgent;
      user.metadata.deviceInfo = dto.deviceInfo;
      await user.save();

      // Generate tokens
      const tokens = await this.tokenService.generateTokens(user);

      // Invalidate other sessions (optional - for single session)
      // await Session.invalidateUserSessions(user._id);

      // Create new session
      await Session.createSession(
        user._id as mongoose.Types.ObjectId,
        tokens.accessToken,
        tokens.refreshToken,
        {
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          deviceInfo: dto.deviceInfo,
        }
      );

      logger.info(`Successful login for user: ${user.email}`);

      // Remove password from response
      user.password = undefined as any;

      return { user, tokens };
    } catch (error) {
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const session = await Session.findOne({ token });

      if (session) {
        await session.invalidateSession();
        logger.info(`User logged out, session invalidated`);
      }
    } catch (error) {
      logger.error("Logout error:", error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ tokens: any }> {
    try {
      // Verify refresh token
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      // Find session
      const session = await Session.findOne({
        refreshToken,
        isActive: true,
      });

      if (!session) {
        throw AppError.unauthorized("Invalid refresh token");
      }

      if (session.isRefreshExpired()) {
        await session.invalidateSession();
        throw AppError.unauthorized("Refresh token expired");
      }

      // Get user
      const user = await User.findById(payload.userId);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw AppError.unauthorized("User not found or inactive");
      }

      // Generate new tokens
      const tokens = await this.tokenService.generateTokens(user);

      // Update session
      session.token = tokens.accessToken;
      session.refreshToken = tokens.refreshToken;
      await session.updateActivity();

      return { tokens };
    } catch (error) {
      throw error;
    }
  }

  async resendVerificationCode(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists
        throw AppError.badRequest(
          "If this email is registered, a verification code will be sent"
        );
      }

      if (user.emailVerified) {
        throw AppError.badRequest("Email is already verified");
      }

      await this.verificationService.sendVerificationCode(
        user._id as mongoose.Types.ObjectId,
        user.email,
        VerificationType.EMAIL_VERIFICATION
      );

      logger.info(`Verification code resent to: ${email}`);
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists
        logger.warn(
          `Password reset requested for non-existent email: ${email}`
        );
        return;
      }

      await this.verificationService.sendVerificationCode(
        user._id as mongoose.Types.ObjectId,
        user.email,
        VerificationType.PASSWORD_RESET
      );

      logger.info(`Password reset code sent to: ${email}`);
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find and validate verification
      const verification = await Verification.findValidVerification(
        dto.code,
        VerificationType.PASSWORD_RESET
      );

      if (!verification) {
        throw AppError.badRequest("Invalid or expired reset code");
      }

      // Get user
      const user = await User.findById(verification.userId).select("+password");

      if (!user || user.email !== dto.email.toLowerCase()) {
        throw AppError.badRequest("Invalid reset request");
      }

      // Update password
      user.password = dto.newPassword;
      await user.save({ session });

      // Mark verification as used
      await verification.markAsVerified();

      // Invalidate all user sessions
      await Session.invalidateUserSessions(user._id as mongoose.Types.ObjectId);

      await session.commitTransaction();

      logger.info(`Password reset successful for user: ${user.email}`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getCurrentUser(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw AppError.notFound("User not found");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}
