import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentCategory?: mongoose.Types.ObjectId;
  image?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  metadata?: {
    productCount?: number;
    lastUpdated?: Date;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  subcategories?: ICategory[];
  path?: string;

  // Methods
  updateProductCount(): Promise<void>;
  getFullPath(): Promise<string>;
  getAllSubcategories(): Promise<ICategory[]>;
}

export interface ICategoryModel extends Model<ICategory> {
  buildTree(): Promise<any[]>;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    image: String,
    icon: String,
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      productCount: {
        type: Number,
        default: 0,
      },
      lastUpdated: Date,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for hierarchical queries
categorySchema.index({ parentCategory: 1, displayOrder: 1 });
categorySchema.index({ name: "text" });

// Virtual populate for subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// Virtual for full category path
categorySchema.virtual("path").get(async function () {
  return await this.getFullPath();
});

// Method to get full category path
categorySchema.methods.getFullPath = async function (): Promise<string> {
  const paths: string[] = [this.name];
  let currentCategory = this;

  while (currentCategory.parentCategory) {
    currentCategory = await Category.findById(currentCategory.parentCategory);
    if (currentCategory) {
      paths.unshift(currentCategory.name);
    } else {
      break;
    }
  }

  return paths.join(" > ");
};

// Method to get all subcategories recursively
categorySchema.methods.getAllSubcategories = async function (): Promise<
  ICategory[]
> {
  const subcategories: ICategory[] = [];

  const getSubcategoriesRecursive = async (
    categoryId: mongoose.Types.ObjectId
  ) => {
    const directSubcategories = await Category.find({
      parentCategory: categoryId,
    });

    for (const subcategory of directSubcategories) {
      subcategories.push(subcategory);
      await getSubcategoriesRecursive(
        subcategory._id as mongoose.Types.ObjectId
      );
    }
  };

  await getSubcategoriesRecursive(this._id);
  return subcategories;
};

// Static method to build category tree
categorySchema.statics.buildTree = async function () {
  const categories = await this.find({ isActive: true })
    .sort("displayOrder")
    .lean();

  const buildTree = (parentId: string | null = null): any[] => {
    return categories
      .filter((cat: any) => {
        const parentMatch = parentId
          ? cat.parentCategory?.toString() === parentId
          : !cat.parentCategory;
        return parentMatch;
      })
      .map((cat: any) => ({
        ...cat,
        subcategories: buildTree(cat._id.toString()),
      }));
  };

  return buildTree();
};

// Update product count
categorySchema.methods.updateProductCount = async function () {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({
    category: this._id,
    status: "active",
  });

  this.metadata = this.metadata || {};
  this.metadata.productCount = count;
  this.metadata.lastUpdated = new Date();
  await this.save();
};

// Pre-save middleware to update metadata
categorySchema.pre("save", function (next) {
  if (this.isModified()) {
    this.metadata = this.metadata || {};
    this.metadata.lastUpdated = new Date();
  }
  next();
});

const Category = mongoose.model<ICategory, ICategoryModel>(
  "Category",
  categorySchema
);
export { Category };
