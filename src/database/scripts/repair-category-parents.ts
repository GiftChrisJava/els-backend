/**
 * Repairs categories whose `parentCategory` points at a category that no longer
 * exists.
 *
 * Two production categories ("Solar Batteries", "Solar PV Module") each carried
 * a `parentCategory` ObjectId for a deleted category. `Category.buildTree()`
 * treated them as children of a parent it could not find and dropped them, so
 * `/public/categories/tree` returned 7 of 9 categories and their products were
 * unreachable from the storefront's category navigation.
 *
 * `buildTree` no longer loses them regardless, but the dangling reference is
 * still wrong: it makes those rows look nested when they are not, and
 * `deleteCategory`'s subcategory guard counts them against a category that
 * does not exist. This nulls the reference so the data matches reality.
 *
 * Also recomputes `metadata.productCount`, which drifted because
 * `updateProduct` read the post-update category and never decremented the
 * previous one.
 *
 * Usage (read-only by default):
 *   npx ts-node src/database/scripts/repair-category-parents.ts
 *   npx ts-node src/database/scripts/repair-category-parents.ts --apply
 */
import mongoose from "mongoose";
import { appConfig } from "../../config/app.config";
import { Category } from "../../modules/admin/sales-admin/models/category.model";
import { Product } from "../../modules/admin/sales-admin/models/product.model";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  await mongoose.connect(appConfig.database.uri);
  console.log(`Connected to ${mongoose.connection.name}`);
  console.log(APPLY ? "Mode: APPLY (writes)" : "Mode: DRY RUN (no writes)\n");

  const categories = await Category.find({}).select(
    "_id name parentCategory isActive metadata"
  );
  const existingIds = new Set(categories.map((c) => c._id.toString()));

  // ── dangling parent references ──────────────────────────────────────────────
  const dangling = categories.filter((c) => {
    const parentId = c.parentCategory?.toString();
    return Boolean(parentId) && !existingIds.has(parentId!);
  });

  console.log(`Categories with a dangling parentCategory: ${dangling.length}`);
  for (const category of dangling) {
    console.log(
      `  ${category.name} -> parent ${category.parentCategory} (missing)`
    );

    if (APPLY) {
      await Category.updateOne(
        { _id: category._id },
        { $set: { parentCategory: null } }
      );
    }
  }

  // ── self-referencing parents ────────────────────────────────────────────────
  const selfParented = categories.filter(
    (c) => c.parentCategory?.toString() === c._id.toString()
  );

  console.log(`\nSelf-referencing categories: ${selfParented.length}`);
  for (const category of selfParented) {
    console.log(`  ${category.name} is its own parent`);

    if (APPLY) {
      await Category.updateOne(
        { _id: category._id },
        { $set: { parentCategory: null } }
      );
    }
  }

  // ── stale product counts ────────────────────────────────────────────────────
  console.log("\nProduct count check:");
  let drifted = 0;

  for (const category of categories) {
    const actual = await Product.countDocuments({
      category: category._id,
      status: "active",
    });
    const stored = category.metadata?.productCount ?? 0;

    if (stored !== actual) {
      drifted++;
      console.log(
        `  ${category.name}: stored ${stored} -> actual ${actual}`
      );

      if (APPLY) {
        await Category.updateOne(
          { _id: category._id },
          { $set: { "metadata.productCount": actual } }
        );
      }
    }
  }

  console.log(`\nCategories with a drifted product count: ${drifted}`);

  // ── products pointing at a missing category ─────────────────────────────────
  const products = await Product.find({}).select("_id name category");
  const orphanProducts = products.filter(
    (p) => p.category && !existingIds.has(p.category.toString())
  );

  console.log(
    `\nProducts referencing a missing category: ${orphanProducts.length}`
  );
  for (const product of orphanProducts.slice(0, 20)) {
    console.log(`  ${product.name} -> category ${product.category} (missing)`);
  }
  if (orphanProducts.length > 0) {
    console.log(
      "  Not changed automatically: pick the right category per product in the CMS."
    );
  }

  if (!APPLY) {
    console.log("\nNothing was written. Re-run with --apply to fix.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Repair failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
