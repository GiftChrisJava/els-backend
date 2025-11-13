import mongoose, { Document, Schema } from "mongoose";

export enum CampaignStatus {
  DRAFT = "draft",
  SENDING = "sending",
  SENT = "sent",
  FAILED = "failed",
}

export interface IEmailCampaign extends Document {
  subject: string;
  message: string;
  htmlMessage?: string;
  recipients: {
    email: string;
    name?: string;
    source: "contact" | "testimonial" | "order";
  }[];
  recipientCount: number;
  status: CampaignStatus;
  sentBy: mongoose.Types.ObjectId;
  sentAt?: Date;
  successCount: number;
  failureCount: number;
  emailErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const emailCampaignSchema = new Schema<IEmailCampaign>(
  {
    subject: {
      type: String,
      required: [true, "Email subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Email message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [10000, "Message cannot exceed 10000 characters"],
    },
    htmlMessage: {
      type: String,
      trim: true,
    },
    recipients: [
      {
        email: {
          type: String,
          required: true,
          lowercase: true,
        },
        name: String,
        source: {
          type: String,
          enum: ["contact", "testimonial", "order"],
        },
      },
    ],
    recipientCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sentAt: Date,
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    emailErrors: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
emailCampaignSchema.index({ createdAt: -1 });
emailCampaignSchema.index({ status: 1, createdAt: -1 });
emailCampaignSchema.index({ sentBy: 1, createdAt: -1 });

// Update recipient count before saving
emailCampaignSchema.pre("save", function (next) {
  this.recipientCount = this.recipients.length;
  next();
});

export const EmailCampaign = mongoose.model<IEmailCampaign>(
  "EmailCampaign",
  emailCampaignSchema
);
