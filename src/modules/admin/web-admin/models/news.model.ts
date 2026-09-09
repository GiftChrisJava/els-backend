import mongoose, { Document, Schema } from "mongoose";

export interface INews extends Document {
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImage: string;
  images: string[];
  category: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  author: mongoose.Types.ObjectId | null;
  viewCount: number;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  incrementViews(): Promise<void>;
  publish(): Promise<void>;
  unpublish(): Promise<void>;
}

export interface INewsModel extends mongoose.Model<INews> {
  findPublished(): mongoose.Query<INews[], INews>;
  /**
   * A slug that is unique across the collection, derived from `title`.
   *
   * `excludeId` lets an update keep its own slug instead of colliding with
   * itself and being pushed to `-2`.
   */
  generateUniqueSlug(
    title: string,
    excludeId?: mongoose.Types.ObjectId | string
  ): Promise<string>;
}

/**
 * Turns a title into a URL-safe slug.
 *
 * Shared with the frontend's `previewSlug` so the "will publish at" hint in
 * web-admin matches what actually gets stored.
 */
export function slugifyTitle(title: string): string {
  return (
    String(title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "article"
  );
}

const newsSchema = new Schema<INews>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
      trim: true,
      maxlength: [500, "Summary cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    images: [{ type: String }],
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    tags: [{ type: String, trim: true }],
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
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
    collection: "news",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Public listings sort by publishedAt within the published set.
newsSchema.index({ isPublished: 1, publishedAt: -1 });
newsSchema.index({ category: 1, isPublished: 1 });
newsSchema.index({ tags: 1 });
// Backs the `search` query parameter.
newsSchema.index({ title: "text", summary: "text" });

/**
 * Keeps `publishedAt` consistent with `isPublished`.
 *
 * Set once on first publish and preserved afterwards, so re-publishing an
 * article does not jump it back to the top of the feed. Cleared on unpublish so
 * a draft never carries a publication date.
 */
newsSchema.pre("save", function (next) {
  if (this.isModified("isPublished")) {
    if (this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date();
    } else if (!this.isPublished) {
      this.publishedAt = null;
    }
  }

  next();
});

newsSchema.statics.findPublished = function () {
  return this.find({ isPublished: true }).sort("-publishedAt");
};

newsSchema.statics.generateUniqueSlug = async function (
  title: string,
  excludeId?: mongoose.Types.ObjectId | string
): Promise<string> {
  const base = slugifyTitle(title);

  // Bounded rather than unbounded: a runaway loop here would hold a request
  // open indefinitely.
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await this.findOne(filter).select("_id").lean();
    if (!existing) {
      return candidate;
    }
  }

  // Fall back to something guaranteed distinct rather than throwing.
  return `${base}-${Date.now()}`;
};

newsSchema.methods.incrementViews = async function () {
  // Atomic, so concurrent reads of the same article do not lose counts and no
  // full document validation runs on a read path.
  await mongoose
    .model("News")
    .updateOne({ _id: this._id }, { $inc: { viewCount: 1 } });
};

newsSchema.methods.publish = async function () {
  this.isPublished = true;
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
  await this.save();
};

newsSchema.methods.unpublish = async function () {
  this.isPublished = false;
  this.publishedAt = null;
  await this.save();
};

export const News = mongoose.model<INews, INewsModel>("News", newsSchema);
