import mongoose from "mongoose";
import { AppError } from "../../../shared/errors/AppError";
import { EmailUtil } from "../../../shared/utils/email.util";
import { logger } from "../../../shared/utils/logger.util";
import {
  IVerification,
  Verification,
  VerificationType,
} from "../models/verification.model";

export class VerificationService {
  private emailUtil: EmailUtil;

  constructor() {
    this.emailUtil = new EmailUtil();
  }

  async sendVerificationCode(
    userId: mongoose.Types.ObjectId,
    email: string,
    type: VerificationType
  ): Promise<IVerification> {
    try {
      // Check for recent verification to prevent spam
      const recentVerification = await Verification.findOne({
        userId,
        type,
        verified: false,
        createdAt: {
          $gte: new Date(Date.now() - 60000), // 1 minute ago
        },
      });

      if (recentVerification && !recentVerification.isExpired()) {
        throw AppError.tooManyRequests(
          "A verification code was recently sent. Please wait before requesting another."
        );
      }

      // Create new verification
      const verification = await Verification.createVerification(
        userId,
        email,
        type
      );

      // Send appropriate email based on type
      await this.sendEmail(email, verification.code, type);

      logger.info(`Verification code sent to ${email} for ${type}`);

      return verification;
    } catch (error) {
      logger.error("Error sending verification code:", error);
      throw error;
    }
  }

  async verifyCode(
    code: string,
    type: VerificationType
  ): Promise<IVerification> {
    try {
      const verification = await Verification.findValidVerification(code, type);

      if (!verification) {
        throw AppError.badRequest("Invalid or expired verification code");
      }

      // Check if max attempts reached
      if (verification.isMaxAttemptsReached()) {
        throw AppError.badRequest("Maximum verification attempts exceeded");
      }

      // Increment attempts
      await verification.incrementAttempts();

      return verification;
    } catch (error) {
      throw error;
    }
  }

  async resendCode(
    userId: mongoose.Types.ObjectId,
    email: string,
    type: VerificationType
  ): Promise<void> {
    try {
      // Find existing verification
      const existingVerification = await Verification.findOne({
        userId,
        type,
        verified: false,
      }).sort({ createdAt: -1 });

      if (existingVerification && !existingVerification.isExpired()) {
        // Check if we can resend (not too frequent)
        const timeSinceCreated =
          Date.now() - existingVerification.createdAt.getTime();

        if (timeSinceCreated < 60000) {
          // Less than 1 minute
          throw AppError.tooManyRequests(
            `Please wait ${Math.ceil(
              (60000 - timeSinceCreated) / 1000
            )} seconds before requesting another code`
          );
        }

        // Generate new code for existing verification
        const newCode = await existingVerification.generateNewCode();
        await this.sendEmail(email, newCode, type);
      } else {
        // Create new verification
        await this.sendVerificationCode(userId, email, type);
      }

      logger.info(`Verification code resent to ${email} for ${type}`);
    } catch (error) {
      throw error;
    }
  }

  private async sendEmail(
    email: string,
    code: string,
    type: VerificationType
  ): Promise<void> {
    try {
      switch (type) {
        case VerificationType.EMAIL_VERIFICATION:
          await this.emailUtil.sendVerificationEmail(email, code);
          break;

        case VerificationType.PASSWORD_RESET:
          await this.emailUtil.sendPasswordResetEmail(email, code);
          break;

        case VerificationType.TWO_FACTOR_AUTH:
          await this.emailUtil.sendTwoFactorEmail(email, code);
          break;

        case VerificationType.PHONE_VERIFICATION:
          // Implement SMS sending here if needed
          logger.warn("Phone verification not implemented");
          break;

        default:
          logger.warn(`Unknown verification type: ${type}`);
      }
    } catch (error) {
      logger.error(`Failed to send ${type} email to ${email}:`, error);
      throw AppError.internal("Failed to send verification email");
    }
  }

  async cleanupExpiredVerifications(): Promise<number> {
    try {
      const result = await Verification.deleteMany({
        expiresAt: { $lt: new Date() },
        verified: false,
      });

      const deleted = result.deletedCount || 0;

      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} expired verifications`);
      }

      return deleted;
    } catch (error) {
      logger.error("Error cleaning up expired verifications:", error);
      return 0;
    }
  }
}
