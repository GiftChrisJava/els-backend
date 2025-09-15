import bcrypt from "bcryptjs";
import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole } from "../../../core/constants/role.constants";
import { UserStatus } from "../../../core/constants/status.constants";

export interface IUserAddress {
  street?: string;
  city?: string;
  district?: string;
  country?: string;
  postalCode?: string;
}

export interface IUserMetadata {
  lastLogin?: Date;
  loginCount?: number;
  lastPasswordChange?: Date;
  passwordResetCount?: number;
  failedLoginAttempts?: number;
  lastFailedLogin?: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  profileImage?: string;
  company?: string;
  address?: IUserAddress;
  metadata?: IUserMetadata;
  permissions?: string[];
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  fullName: string;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: string): boolean;
  canPerformAction(action: string): boolean;
  toJSON(): any;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: string): boolean;
  canPerformAction(action: string): boolean;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v: string) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(
            v
          );
        },
        message: "Please enter a valid phone number",
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING_VERIFICATION,
      required: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      district: { type: String, trim: true },
      country: { type: String, trim: true, default: "Malawi" },
      postalCode: { type: String, trim: true },
    },
    metadata: {
      lastLogin: Date,
      loginCount: { type: Number, default: 0 },
      lastPasswordChange: Date,
      passwordResetCount: { type: Number, default: 0 },
      failedLoginAttempts: { type: Number, default: 0 },
      lastFailedLogin: Date,
      ipAddress: String,
      userAgent: String,
      deviceInfo: String,
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "metadata.lastLogin": -1 });

// Virtual fields
userSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);

    // Update password change metadata
    if (!this.isNew) {
      this.metadata = this.metadata || {};
      this.metadata.lastPasswordChange = new Date();
      this.metadata.passwordResetCount =
        (this.metadata.passwordResetCount || 0) + 1;
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

userSchema.methods.hasPermission = function (permission: string): boolean {
  return this.permissions?.includes(permission) || false;
};

userSchema.methods.canPerformAction = function (action: string): boolean {
  // Check role-based permissions
  const rolePermissions =
    require("@core/constants/roles.constants").ROLE_PERMISSIONS;
  const userPermissions = rolePermissions[this.role] || [];

  return userPermissions.includes(action) || this.hasPermission(action);
};

// Transform output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.deletedAt;
  return obj;
};

// Soft delete query middleware
userSchema.pre(/^find/, function (this: any) {
  // Only apply soft delete filter if not explicitly including deleted
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: { $exists: false } });
  }
});

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
