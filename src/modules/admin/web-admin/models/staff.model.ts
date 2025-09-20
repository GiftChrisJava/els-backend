import mongoose, { Document, Schema } from "mongoose";

export enum StaffDepartment {
  MANAGEMENT = "management",
  SALES = "sales",
  TECHNICAL = "technical",
  OPERATIONS = "operations",
  CUSTOMER_SERVICE = "customer-service",
  FINANCE = "finance",
  HUMAN_RESOURCES = "human-resources",
  MARKETING = "marketing",
  IT = "it",
  OTHER = "other",
}

export enum StaffStatus {
  ACTIVE = "active",
  ON_LEAVE = "on-leave",
  INACTIVE = "inactive",
}

export interface ISocialLinks {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
}

export interface IQualification {
  degree: string;
  institution: string;
  year: number;
}

export interface IStaff extends Document {
  employeeId?: string;
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  displayName: string;
  position: string;
  department: StaffDepartment;
  email: string;
  phone?: string;
  bio: string;
  profileImage: string;
  coverImage?: string;
  qualifications?: IQualification[];
  skills?: string[];
  yearsOfExperience?: number;
  joinedDate?: Date;
  socialLinks?: ISocialLinks;
  achievements?: string[];
  specializations?: string[];
  languages?: string[];
  isTeamLead: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  status: StaffStatus;
  availability?: {
    isAvailable: boolean;
    message?: string;
  };
  statistics?: {
    projectsCompleted?: number;
    clientsServed?: number;
    rating?: number;
    totalReviews?: number;
  };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffModel extends mongoose.Model<IStaff> {
  findTeamLeads(): mongoose.Query<IStaff[], IStaff>;
}

const staffSchema = new Schema<IStaff>(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    department: {
      type: String,
      enum: Object.values(StaffDepartment),
      default: StaffDepartment.OTHER,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      required: [true, "Bio is required"],
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    profileImage: {
      type: String,
      required: [true, "Profile image is required"],
    },
    coverImage: String,
    qualifications: [
      {
        degree: {
          type: String,
          required: true,
        },
        institution: {
          type: String,
          required: true,
        },
        year: {
          type: Number,
          required: true,
        },
      },
    ],
    skills: [String],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    joinedDate: Date,
    socialLinks: {
      linkedin: {
        type: String,
        default: "",
      },
      facebook: {
        type: String,
        default: "",
      },
      instagram: {
        type: String,
        default: "",
      },
    },
    achievements: [String],
    specializations: [String],
    languages: [String],
    isTeamLead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(StaffStatus),
      default: StaffStatus.ACTIVE,
      index: true,
    },
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      message: String,
    },
    statistics: {
      projectsCompleted: {
        type: Number,
        default: 0,
      },
      clientsServed: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "staff",
  }
);

// Indexes
staffSchema.index({
  firstName: "text",
  lastName: "text",
  position: "text",
  bio: "text",
});
staffSchema.index({ department: 1, status: 1 });
staffSchema.index({ isPublished: 1, isFeatured: 1, displayOrder: 1 });
staffSchema.index({ isTeamLead: 1, department: 1 });

// Virtual for full name
staffSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
staffSchema.pre("save", function (next) {
  // Auto-generate display name if not provided
  if (!this.displayName && this.firstName && this.lastName) {
    this.displayName = `${this.firstName} ${this.lastName}`;
  }

  // Generate employee ID if not provided
  if (!this.employeeId && this.isNew) {
    this.employeeId = `EMP${Date.now().toString().slice(-6)}`;
  }

  next();
});

// Static methods
staffSchema.statics.findByDepartment = function (department: StaffDepartment) {
  return this.find({
    department,
    status: StaffStatus.ACTIVE,
    isPublished: true,
  }).sort("displayOrder");
};

staffSchema.statics.findTeamLeads = function () {
  return this.find({
    isTeamLead: true,
    status: StaffStatus.ACTIVE,
    isPublished: true,
  }).sort("displayOrder");
};

staffSchema.statics.findFeatured = function () {
  return this.find({
    isFeatured: true,
    status: StaffStatus.ACTIVE,
    isPublished: true,
  }).sort("displayOrder");
};

// Instance methods
staffSchema.methods.updateStatistics = async function (
  field: string,
  increment: number = 1
) {
  this.statistics = this.statistics || {};
  this.statistics[field] = (this.statistics[field] || 0) + increment;
  await this.save();
};

export const Staff = mongoose.model<IStaff, IStaffModel>("Staff", staffSchema);
