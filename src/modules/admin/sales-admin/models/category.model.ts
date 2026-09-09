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
    .sort({ displayOrder: 1, name: 1 })
    .lean();

  const presentIds = new Set(categories.map((cat: any) => cat._id.toString()));

  /**
   * Children indexed by parent id, so the tree is assembled in one pass rather
   * than re-scanning the whole list at every level.
   */
  const childrenOf = new Map<string, any[]>();
  for (const cat of categories) {
    const parentId = cat.parentCategory?.toString();
    if (!parentId || !presentIds.has(parentId)) continue;
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(cat);
  }

  const emitted = new Set<string>();

  const attach = (cat: any, ancestry: Set<string>): any => {
    const id = cat._id.toString();
    emitted.add(id);

    const nextAncestry = new Set(ancestry).add(id);
    const children = childrenOf.get(id) || [];

    return {
      ...cat,
      // `ancestry` stops a parent chain that loops back on itself from
      // recursing until the stack overflows.
      subcategories: children
        .filter((child: any) => !nextAncestry.has(child._id.toString()))
        .map((child: any) => attach(child, nextAncestry)),
    };
  };

  /**
   * A category is a root when it has no parent, OR when its parent is not in
   * this result set - because the parent was deleted, or is `isActive: false`
   * and was filtered out above.
   *
   * That second case was silently dropping categories. Production had 9 active
   * categories while this returned 7, hiding "Solar Batteries" and
   * "Solar PV Module" - and their products - from the public site, because both
   * pointed at a parent that no longer existed.
   */
  const tree = categories
    .filter((cat: any) => {
      const parentId = cat.parentCategory?.toString();
      return !parentId || !presentIds.has(parentId);
    })
    .map((cat: any) => attach(cat, new Set<string>()));

  /**
   * Anything still unemitted is part of a parent cycle, so it has a parent that
   * exists but is not reachable from any root. Surface those as roots as well:
   * the invariant callers rely on is that every active category appears in the
   * tree exactly once.
   */
  for (const cat of categories) {
    if (emitted.has(cat._id.toString())) continue;
    tree.push(attach(cat, new Set<string>()));
  }

  return tree;
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
