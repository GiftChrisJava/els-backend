import mongoose, { Document, Schema } from "mongoose";

export enum ContactStatus {
  NEW = "new",
  READ = "read",
  REPLIED = "replied",
  ARCHIVED = "archived",
  SPAM = "spam",
}

export enum ContactPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  service?: string;
  status: ContactStatus;
  priority: ContactPriority;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    submittedAt?: Date;
  };
  adminNotes?: string;
  repliedAt?: Date;
  repliedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsRead(): Promise<void>;
  markAsReplied(repliedBy: mongoose.Types.ObjectId): Promise<void>;
  markAsSpam(): Promise<void>;
}

export interface IContactMessageModel extends mongoose.Model<IContactMessage> {
  getNewMessages(): mongoose.Query<IContactMessage[], IContactMessage>;
  getUnrepliedMessages(): mongoose.Query<IContactMessage[], IContactMessage>;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    service: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ContactStatus),
      default: ContactStatus.NEW,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(ContactPriority),
      default: ContactPriority.MEDIUM,
      index: true,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
      submittedAt: Date,
    },
    adminNotes: {
      type: String,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    repliedAt: Date,
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

// Instance Methods
contactMessageSchema.methods.markAsRead = async function (): Promise<void> {
  if (this.status === ContactStatus.NEW) {
    this.status = ContactStatus.READ;
    await this.save();
  }
};

contactMessageSchema.methods.markAsReplied = async function (
  repliedBy: mongoose.Types.ObjectId
): Promise<void> {
  this.status = ContactStatus.REPLIED;
  this.repliedAt = new Date();
  this.repliedBy = repliedBy;
  await this.save();
};

contactMessageSchema.methods.markAsSpam = async function (): Promise<void> {
  this.status = ContactStatus.SPAM;
  await this.save();
};

// Static Methods
contactMessageSchema.statics.getNewMessages = function () {
  return this.find({ status: ContactStatus.NEW }).sort({ createdAt: -1 });
};

contactMessageSchema.statics.getUnrepliedMessages = function () {
  return this.find({
    status: { $in: [ContactStatus.NEW, ContactStatus.READ] },
  }).sort({ createdAt: -1 });
};

export const ContactMessage = mongoose.model<
  IContactMessage,
  IContactMessageModel
>("ContactMessage", contactMessageSchema);
