import mongoose, { Document, Schema } from "mongoose";

export enum SlideStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ISlideMedia {
  imageUrl: string;
  alt?: string;
}

export interface ILandingSlide extends Document {
  title?: string;
  media: ISlideMedia;
  status: SlideStatus;
  displayOrder: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
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
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    media: {
      imageUrl: {
        type: String,
        required: [true, "Image URL is required"],
      },
      alt: {
        type: String,
        maxlength: [200, "Alt text cannot exceed 200 characters"],
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "landing_slides",
  }
);

// Indexes
landingSlideSchema.index({ status: 1, displayOrder: 1 });

// Static methods
landingSlideSchema.statics.findActive = function () {
  return this.find({
    status: SlideStatus.ACTIVE,
  }).sort("displayOrder");
};

// Instance methods
landingSlideSchema.methods.activate = async function () {
  this.status = SlideStatus.ACTIVE;
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
