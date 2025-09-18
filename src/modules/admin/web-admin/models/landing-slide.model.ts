import mongoose, { Document, Schema } from "mongoose";

export enum SlideStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SCHEDULED = "scheduled",
  EXPIRED = "expired",
}

export enum SlideType {
  IMAGE = "image",
  VIDEO = "video",
  HERO = "hero",
  CAROUSEL = "carousel",
}

export enum ButtonStyle {
  PRIMARY = "primary",
  SECONDARY = "secondary",
  OUTLINE = "outline",
  GHOST = "ghost",
}

export interface ISlideButton {
  text: string;
  link: string;
  style: ButtonStyle;
  target?: "_self" | "_blank";
  icon?: string;
}

export interface ISlideContent {
  heading?: string;
  subheading?: string;
  description?: string;
  highlightText?: string;
  buttons?: ISlideButton[];
  customHtml?: string;
}

export interface ISlideMedia {
  desktop: string;
  mobile?: string;
  tablet?: string;
  alt?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface ISlideAnimation {
  entrance?: string;
  duration?: number;
  delay?: number;
  easing?: string;
}

export interface ILandingSlide extends Document {
  title: string;
  type: SlideType;
  content: ISlideContent;
  media: ISlideMedia;
  animation?: ISlideAnimation;
  overlay?: {
    enabled: boolean;
    color?: string;
    opacity?: number;
  };
  position?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "top" | "center" | "bottom";
  };
  status: SlideStatus;
  displayOrder: number;
  validFrom?: Date;
  validUntil?: Date;
  targetAudience?: string[];
  deviceVisibility?: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
  };
  analytics?: {
    impressions: number;
    clicks: number;
    conversionRate?: number;
  };
  seo?: {
    altText?: string;
    ariaLabel?: string;
  };
  tags?: string[];
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  publishedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  incrementClick(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export interface ILandingSlideModel extends mongoose.Model<ILandingSlide> {
  findActive(): mongoose.Query<ILandingSlide[], ILandingSlide>;
}

const landingSlideSchema = new Schema<ILandingSlide>(
  {
    title: {
      type: String,
      required: [true, "Slide title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    type: {
      type: String,
      enum: Object.values(SlideType),
      default: SlideType.IMAGE,
      required: true,
    },
    content: {
      heading: {
        type: String,
        maxlength: [200, "Heading cannot exceed 200 characters"],
      },
      subheading: {
        type: String,
        maxlength: [150, "Subheading cannot exceed 150 characters"],
      },
      description: {
        type: String,
        maxlength: [500, "Description cannot exceed 500 characters"],
      },
      highlightText: String,
      buttons: [
        {
          text: {
            type: String,
            required: true,
          },
          link: {
            type: String,
            required: true,
          },
          style: {
            type: String,
            enum: Object.values(ButtonStyle),
            default: ButtonStyle.PRIMARY,
          },
          target: {
            type: String,
            enum: ["_self", "_blank"],
            default: "_self",
          },
          icon: String,
        },
      ],
      customHtml: String,
    },
    media: {
      desktop: {
        type: String,
        required: [true, "Desktop image is required"],
      },
      mobile: String,
      tablet: String,
      alt: String,
      videoUrl: String,
      thumbnailUrl: String,
    },
    animation: {
      entrance: String,
      duration: Number,
      delay: Number,
      easing: String,
    },
    overlay: {
      enabled: {
        type: Boolean,
        default: false,
      },
      color: String,
      opacity: {
        type: Number,
        min: 0,
        max: 1,
      },
    },
    position: {
      horizontal: {
        type: String,
        enum: ["left", "center", "right"],
        default: "center",
      },
      vertical: {
        type: String,
        enum: ["top", "center", "bottom"],
        default: "center",
      },
    },
    status: {
      type: String,
      enum: Object.values(SlideStatus),
      default: SlideStatus.INACTIVE,
      required: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      required: true,
    },
    validFrom: Date,
    validUntil: Date,
    targetAudience: [String],
    deviceVisibility: {
      desktop: {
        type: Boolean,
        default: true,
      },
      tablet: {
        type: Boolean,
        default: true,
      },
      mobile: {
        type: Boolean,
        default: true,
      },
    },
    analytics: {
      impressions: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      conversionRate: Number,
    },
    seo: {
      altText: String,
      ariaLabel: String,
    },
    tags: [String],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
    collection: "landing_slides",
  }
);

// Indexes
landingSlideSchema.index({ status: 1, displayOrder: 1 });
landingSlideSchema.index({ validFrom: 1, validUntil: 1 });
landingSlideSchema.index({ type: 1, status: 1 });

// Pre-save middleware
landingSlideSchema.pre("save", function (next) {
  // Check and update status based on validity dates
  const now = new Date();

  if (this.validFrom && this.validUntil) {
    if (now < this.validFrom) {
      this.status = SlideStatus.SCHEDULED;
    } else if (now > this.validUntil) {
      this.status = SlideStatus.EXPIRED;
    } else if (
      this.status === SlideStatus.SCHEDULED ||
      this.status === SlideStatus.EXPIRED
    ) {
      this.status = SlideStatus.ACTIVE;
    }
  }

  // Set published date
  if (
    this.isModified("status") &&
    this.status === SlideStatus.ACTIVE &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

// Static methods
landingSlideSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    status: SlideStatus.ACTIVE,
    $or: [
      { validFrom: { $exists: false }, validUntil: { $exists: false } },
      { validFrom: { $lte: now }, validUntil: { $gte: now } },
      { validFrom: { $lte: now }, validUntil: { $exists: false } },
      { validFrom: { $exists: false }, validUntil: { $gte: now } },
    ],
  }).sort("displayOrder");
};

landingSlideSchema.statics.findByDevice = function (
  device: "desktop" | "tablet" | "mobile"
) {
  const query: any = {
    status: SlideStatus.ACTIVE,
  };
  query[`deviceVisibility.${device}`] = true;

  return this.find(query).sort("displayOrder");
};

// Instance methods
landingSlideSchema.methods.incrementImpression = async function () {
  this.analytics = this.analytics || { impressions: 0, clicks: 0 };
  this.analytics.impressions += 1;
  await this.save();
};

landingSlideSchema.methods.incrementClick = async function () {
  this.analytics = this.analytics || { impressions: 0, clicks: 0 };
  this.analytics.clicks += 1;

  // Calculate conversion rate
  if (this.analytics.impressions > 0) {
    this.analytics.conversionRate =
      (this.analytics.clicks / this.analytics.impressions) * 100;
  }

  await this.save();
};

landingSlideSchema.methods.activate = async function () {
  this.status = SlideStatus.ACTIVE;
  this.publishedAt = new Date();
  await this.save();
};

landingSlideSchema.methods.deactivate = async function () {
  this.status = SlideStatus.INACTIVE;
  await this.save();
};

export const LandingSlide = mongoose.model<ILandingSlide, ILandingSlideModel>(
  "LandingSlide",
  landingSlideSchema
);
