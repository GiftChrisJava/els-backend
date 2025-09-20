import mongoose, { Document, Schema } from "mongoose";

export enum ProjectStatus {
  PLANNING = "planning",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
  ON_HOLD = "on-hold",
  CANCELLED = "cancelled",
}

export enum ProjectCategory {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  INDUSTRIAL = "industrial",
  GOVERNMENT = "government",
  NGO = "ngo",
  OTHER = "other",
}

export interface IProject extends Document {
  title: string;
  slug: string;
  client: string;
  clientLogo?: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  duration?: string;
  location: {
    city: string;
    district?: string;
    country: string;
  };
  images: {
    featured: string;
    gallery: string[];
    beforeAfter?: {
      before: string;
      after: string;
    }[];
  };
  technologies?: string[];
  teamSize?: number;
  projectValue?: {
    amount: number;
    currency: string;
    displayPublicly: boolean;
  };
  challenges?: string;
  solutions?: string;
  outcomes?: string[];
  testimonial?: {
    content: string;
    author: string;
    position: string;
  };
  isPublished: boolean;
  displayOrder: number;
  tags?: string[];
  relatedServices?: mongoose.Types.ObjectId[];
  statistics?: {
    views: number;
    shares: number;
    inquiries: number;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  incrementViews(): Promise<void>;
  publish(): Promise<void>;
}

export interface IProjectModel extends mongoose.Model<IProject> {
  findPublished(): mongoose.Query<IProject[], IProject>;
}

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Project title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    client: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    clientLogo: String,
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      enum: Object.values(ProjectCategory),
      default: ProjectCategory.OTHER,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.PLANNING,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, "Project start date is required"],
    },
    endDate: Date,
    duration: {
      type: String,
    },
    location: {
      city: {
        type: String,
        required: true,
      },
      district: String,
      country: {
        type: String,
        default: "Malawi",
      },
    },
    images: {
      featured: {
        type: String,
        required: [true, "Featured image is required"],
      },
      gallery: [String],
      beforeAfter: [
        {
          before: String,
          after: String,
        },
      ],
    },
    technologies: [String],
    teamSize: Number,
    projectValue: {
      amount: Number,
      currency: {
        type: String,
        default: "MWK",
      },
      displayPublicly: {
        type: Boolean,
        default: false,
      },
    },
    challenges: {
      type: String,
      maxlength: [2000, "Challenges description cannot exceed 2000 characters"],
    },
    solutions: {
      type: String,
      maxlength: [2000, "Solutions description cannot exceed 2000 characters"],
    },
    outcomes: [String],
    testimonial: {
      content: String,
      author: String,
      position: String,
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
    tags: [String],
    relatedServices: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    statistics: {
      views: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      inquiries: {
        type: Number,
        default: 0,
      },
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
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
    publishedAt: Date,
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

// Indexes
projectSchema.index({ title: "text", description: "text", client: "text" });
projectSchema.index({ isPublished: 1, displayOrder: 1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ startDate: -1 });
projectSchema.index({ "location.city": 1, "location.district": 1 });

// Pre-save middleware
projectSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Static methods
projectSchema.statics.findPublished = function () {
  return this.find({ isPublished: true }).sort("-publishedAt");
};

// Instance methods
projectSchema.methods.incrementViews = async function () {
  this.statistics = this.statistics || { views: 0, shares: 0, inquiries: 0 };
  this.statistics.views += 1;
  await this.save();
};

projectSchema.methods.publish = async function () {
  this.isPublished = true;
  this.publishedAt = new Date();
  await this.save();
};

export const Project = mongoose.model<IProject, IProjectModel>(
  "Project",
  projectSchema
);
