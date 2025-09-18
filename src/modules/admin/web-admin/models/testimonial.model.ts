import mongoose, { Document, Schema } from "mongoose";

export enum TestimonialStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}

export enum TestimonialType {
  TEXT = "text",
  VIDEO = "video",
  AUDIO = "audio",
}

export interface ITestimonial extends Document {
  type: TestimonialType;
  content: string;
  rating: number;
  author: {
    name: string;
    position?: string;
    company?: string;
    email?: string;
    phone?: string;
    image?: string;
  };
  project?: mongoose.Types.ObjectId;
  service?: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  mediaUrl?: string;
  thumbnailUrl?: string;
  status: TestimonialStatus;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  publishedAt?: Date;
  tags?: string[];
  source?: string;
  verificationDetails?: {
    isVerified: boolean;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    verificationNotes?: string;
  };
  socialProof?: {
    platform?: string;
    profileUrl?: string;
    postUrl?: string;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    submittedAt?: Date;
  };
  adminNotes?: string;
  rejectionReason?: string;
  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  approve(approvedBy: mongoose.Types.ObjectId): Promise<void>;
  reject(reason: string, rejectedBy: mongoose.Types.ObjectId): Promise<void>;
}

export interface ITestimonialModel extends mongoose.Model<ITestimonial> {
  findFeatured(): mongoose.Query<ITestimonial[], ITestimonial>;
  findPending(): mongoose.Query<ITestimonial[], ITestimonial>;
  getAverageRating(): Promise<{ averageRating: number; totalReviews: number }>;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    type: {
      type: String,
      enum: Object.values(TestimonialType),
      default: TestimonialType.TEXT,
      required: true,
    },
    content: {
      type: String,
      required: [true, "Testimonial content is required"],
      minlength: [20, "Testimonial must be at least 20 characters"],
      maxlength: [2000, "Testimonial cannot exceed 2000 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    author: {
      name: {
        type: String,
        required: [true, "Author name is required"],
        trim: true,
      },
      position: {
        type: String,
        trim: true,
      },
      company: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      image: String,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    mediaUrl: String,
    thumbnailUrl: String,
    status: {
      type: String,
      enum: Object.values(TestimonialStatus),
      default: TestimonialStatus.PENDING,
      required: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    publishedAt: Date,
    tags: [String],
    source: {
      type: String,
      trim: true,
    },
    verificationDetails: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      verifiedAt: Date,
      verificationNotes: String,
    },
    socialProof: {
      platform: String,
      profileUrl: String,
      postUrl: String,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
      submittedAt: Date,
    },
    adminNotes: String,
    rejectionReason: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "testimonials",
  }
);

// Indexes
testimonialSchema.index({ status: 1, isPublished: 1, isFeatured: 1 });
testimonialSchema.index({ rating: -1, publishedAt: -1 });
testimonialSchema.index({ "author.company": 1 });
testimonialSchema.index({ project: 1, service: 1, product: 1 });

// Pre-save middleware
testimonialSchema.pre("save", function (next) {
  // Set published date when publishing
  if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-publish approved testimonials
  if (this.isModified("status") && this.status === TestimonialStatus.APPROVED) {
    this.isPublished = true;
  }

  next();
});

// Static methods
testimonialSchema.statics.findPublished = function () {
  return this.find({
    status: TestimonialStatus.APPROVED,
    isPublished: true,
  }).sort("-publishedAt");
};

testimonialSchema.statics.findFeatured = function () {
  return this.find({
    status: TestimonialStatus.APPROVED,
    isPublished: true,
    isFeatured: true,
  }).sort("displayOrder");
};

testimonialSchema.statics.findPending = function () {
  return this.find({
    status: TestimonialStatus.PENDING,
  }).sort("-createdAt");
};

testimonialSchema.statics.getAverageRating = async function () {
  const result = await this.aggregate([
    {
      $match: {
        status: TestimonialStatus.APPROVED,
        isPublished: true,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { averageRating: 0, totalReviews: 0 };
};

// Instance methods
testimonialSchema.methods.approve = async function (
  approvedBy: mongoose.Types.ObjectId
) {
  this.status = TestimonialStatus.APPROVED;
  this.isPublished = true;
  this.approvedBy = approvedBy;
  this.publishedAt = new Date();
  await this.save();
};

testimonialSchema.methods.reject = async function (
  reason: string,
  rejectedBy: mongoose.Types.ObjectId
) {
  this.status = TestimonialStatus.REJECTED;
  this.isPublished = false;
  this.rejectionReason = reason;
  this.lastModifiedBy = rejectedBy;
  await this.save();
};

export const Testimonial = mongoose.model<ITestimonial, ITestimonialModel>(
  "Testimonial",
  testimonialSchema
);
