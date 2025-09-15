import crypto from "crypto";
import mongoose, { Document, Model, Schema } from "mongoose";
import { appConfig } from "../../../config/app.config";

export enum VerificationType {
  EMAIL_VERIFICATION = "email-verification",
  PASSWORD_RESET = "password-reset",
  TWO_FACTOR_AUTH = "two-factor-auth",
  PHONE_VERIFICATION = "phone-verification",
}

export interface IVerification extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  code: string;
  type: VerificationType;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  verifiedAt?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isExpired(): boolean;
  isMaxAttemptsReached(): boolean;
  incrementAttempts(): Promise<void>;
  markAsVerified(): Promise<void>;
  generateNewCode(): Promise<string>;
}

export interface IVerificationMethods {
  isExpired(): boolean;
  isMaxAttemptsReached(): boolean;
  incrementAttempts(): Promise<void>;
  markAsVerified(): Promise<void>;
  generateNewCode(): Promise<string>;
}

interface IVerificationStatics {
  generateCode(): string;
  createVerification(
    userId: mongoose.Types.ObjectId,
    email: string,
    type: VerificationType,
    metadata?: any
  ): Promise<IVerification>;
  findValidVerification(
    code: string,
    type: VerificationType
  ): Promise<IVerification | null>;
}

type VerificationModel = Model<IVerification, {}, IVerificationMethods> &
  IVerificationStatics;

const verificationSchema = new Schema<
  IVerification,
  VerificationModel,
  IVerificationMethods
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(VerificationType),
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function () {
        return new Date(
          Date.now() + appConfig.verification.expiryMinutes * 60 * 1000
        );
      },
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: appConfig.verification.maxAttempts || 3,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      deviceInfo: String,
    },
  },
  {
    timestamps: true,
    collection: "verifications",
  }
);

// Compound indexes for efficient queries
verificationSchema.index({ userId: 1, type: 1, verified: 1 });
verificationSchema.index({ code: 1, type: 1, verified: 1 });
verificationSchema.index({ email: 1, type: 1, verified: 1 });

// TTL index to automatically delete expired verifications after 24 hours
verificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 86400 } // 24 hours after expiry
);

// Instance methods
verificationSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

verificationSchema.methods.isMaxAttemptsReached = function (): boolean {
  return this.attempts >= this.maxAttempts;
};

verificationSchema.methods.incrementAttempts =
  async function (): Promise<void> {
    this.attempts += 1;
    await this.save();
  };

verificationSchema.methods.markAsVerified = async function (): Promise<void> {
  this.verified = true;
  this.verifiedAt = new Date();
  await this.save();
};

verificationSchema.methods.generateNewCode =
  async function (): Promise<string> {
    const newCode = (this.constructor as VerificationModel).generateCode();
    this.code = newCode;
    this.attempts = 0;
    this.expiresAt = new Date(
      Date.now() + appConfig.verification.expiryMinutes * 60 * 1000
    );
    await this.save();
    return newCode;
  };

// Static methods
verificationSchema.statics.generateCode = function (): string {
  // Generate a 6-digit numeric code
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
};

verificationSchema.statics.createVerification = async function (
  userId: mongoose.Types.ObjectId,
  email: string,
  type: VerificationType,
  metadata?: any
): Promise<IVerification> {
  // Invalidate any existing verifications for this user and type
  await this.updateMany(
    {
      userId,
      type,
      verified: false,
    },
    {
      $set: { verified: true },
    }
  );

  // Create new verification
  const code = this.generateCode();
  const verification = await this.create({
    userId,
    email,
    code,
    type,
    metadata,
  });

  return verification;
};

verificationSchema.statics.findValidVerification = async function (
  code: string,
  type: VerificationType
): Promise<IVerification | null> {
  const verification = await this.findOne({
    code,
    type,
    verified: false,
  });

  if (!verification) {
    return null;
  }

  if (verification.isExpired()) {
    return null;
  }

  if (verification.isMaxAttemptsReached()) {
    return null;
  }

  return verification;
};

export const Verification = mongoose.model<IVerification, VerificationModel>(
  "Verification",
  verificationSchema
);
