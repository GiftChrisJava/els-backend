import mongoose from "mongoose";
import {
  ActivityLog,
  ActivitySeverity,
  ActivityType,
} from "../../../../modules/admin/system-admin/models/activity-log.model";
import { AppError } from "../../../../shared/errors/AppError";
import { storageService } from "../../../../shared/services/storage.service";
import { logger } from "../../../../shared/utils/logger.util";
import { INews, News } from "../models/news.model";

export interface NewsDto {
  title: string;
  summary: string;
  content: string;
  category: string;
  slug?: string;
  tags?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  coverImage?: string;
  images?: string[];
}

export interface NewsFilters {
  search?: string;
  status?: "published" | "draft";
  category?: string;
  tag?: string;
  isFeatured?: boolean;
}

export interface NewsPagination {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Sort fields a client is allowed to order by. */
const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "publishedAt",
  "title",
  "viewCount",
]);

export class NewsService {
  /**
   * Builds the Mongo query for a set of filters.
   *
   * `publishedOnly` is passed by the public routes and is not derived from
   * user input, so a draft can never be exposed by a crafted query string.
   */
  private buildQuery(
    filters: NewsFilters = {},
    publishedOnly = false
  ): Record<string, any> {
    const query: Record<string, any> = {};

    if (publishedOnly) {
      query.isPublished = true;
    } else if (filters.status === "published") {
      query.isPublished = true;
    } else if (filters.status === "draft") {
      query.isPublished = false;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.tag) {
      query.tags = filters.tag;
    }

    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    if (filters.search) {
      // Escaped before being used as a regex: an unescaped user string can
      // both mis-match and, with nested quantifiers, hang the query.
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      query.$or = [{ title: pattern }, { summary: pattern }];
    }

    return query;
  }

  private resolveSort(
    pagination: NewsPagination = {},
    publishedOnly = false
  ): Record<string, 1 | -1> {
    const requested = pagination.sortBy;
    const field =
      requested && SORTABLE_FIELDS.has(requested)
        ? requested
        : publishedOnly
        ? "publishedAt"
        : "createdAt";

    const direction: 1 | -1 = pagination.sortOrder === "asc" ? 1 : -1;
    return { [field]: direction };
  }

  /**
   * Lists articles. Callers on public routes must pass `publishedOnly: true`.
   */
  async listNews(
    filters: NewsFilters = {},
    pagination: NewsPagination = {},
    publishedOnly = false
  ) {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));

    const query = this.buildQuery(filters, publishedOnly);
    const sort = this.resolveSort(pagination, publishedOnly);

    const [articles, total] = await Promise.all([
      News.find(query)
        .select(publishedOnly ? "-createdBy -lastModifiedBy" : "")
        .populate("author", "firstName lastName fullName")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      News.countDocuments(query),
    ]);

    return { articles, total, page, limit };
  }

  /**
   * A single published article by slug, plus a few related ones.
   *
   * Only ever returns published articles, so a draft is not reachable by
   * guessing its slug.
   */
  async getPublishedBySlug(slug: string) {
    const article = await News.findOne({ slug, isPublished: true })
      .select("-createdBy -lastModifiedBy")
      .populate("author", "firstName lastName fullName");

    if (!article) {
      throw AppError.notFound("Article not found");
    }

    const relatedArticles = await News.find({
      _id: { $ne: article._id },
      isPublished: true,
      category: article.category,
    })
      .select("-createdBy -lastModifiedBy -content")
      .sort("-publishedAt")
      .limit(3)
      .lean();

    // Fire-and-forget: a failed counter must not fail the page load.
    article.incrementViews().catch((error) => {
      logger.warn("Failed to increment news view count", {
        slug,
        error: error instanceof Error ? error.message : error,
      });
    });

    return { article, relatedArticles };
  }

  async getNewsById(newsId: string): Promise<INews> {
    if (!mongoose.Types.ObjectId.isValid(newsId)) {
      throw AppError.badRequest("Invalid article id");
    }

    const article = await News.findById(newsId).populate(
      "author",
      "firstName lastName fullName"
    );

    if (!article) {
      throw AppError.notFound("Article not found");
    }

    return article;
  }

  async createNews(
    adminId: mongoose.Types.ObjectId,
    dto: NewsDto
  ): Promise<INews> {
    const slug = await News.generateUniqueSlug(dto.slug || dto.title);

    const article = new News({
      ...dto,
      slug,
      author: adminId,
      createdBy: adminId,
    });

    await article.save();

    await ActivityLog.create({
      type: ActivityType.CONTENT_CREATED,
      severity: ActivitySeverity.INFO,
      userId: adminId,
      description: `News article created: ${article.title}`,
      module: "web-admin",
      action: "create-news",
      ipAddress: "",
      metadata: { newsId: article._id, slug: article.slug },
    });

    logger.info(`News article created: ${article.title}`);
    return article;
  }

  async updateNews(
    newsId: string,
    adminId: mongoose.Types.ObjectId,
    dto: Partial<NewsDto>
  ): Promise<INews> {
    const article = await this.getNewsById(newsId);

    // Only re-slug when the title actually changed, so a published URL stays
    // stable across unrelated edits.
    if (dto.title && dto.title !== article.title) {
      article.slug = await News.generateUniqueSlug(dto.title, article._id);
    }

    // An explicit slug always wins, but is still de-duplicated.
    if (dto.slug && dto.slug !== article.slug) {
      article.slug = await News.generateUniqueSlug(dto.slug, article._id);
    }

    // Assign only the fields the caller sent. `undefined` means "not
    // provided"; an empty string is a deliberate clear and is applied.
    const assignable: (keyof NewsDto)[] = [
      "title",
      "summary",
      "content",
      "category",
      "tags",
      "isPublished",
      "isFeatured",
      "coverImage",
      "images",
    ];

    const previousCover = article.coverImage;

    for (const field of assignable) {
      if (dto[field] !== undefined) {
        (article as any)[field] = dto[field];
      }
    }

    article.lastModifiedBy = adminId;
    await article.save();

    // Replaced cover images are removed from storage so the bucket does not
    // accumulate orphans. Best-effort: never fail the update over it.
    if (
      dto.coverImage &&
      previousCover &&
      previousCover !== dto.coverImage &&
      storageService.isStoredUrl?.(previousCover)
    ) {
      storageService.deleteImage(previousCover).catch((error) => {
        logger.warn("Failed to delete replaced news cover image", {
          previousCover,
          error: error instanceof Error ? error.message : error,
        });
      });
    }

    await ActivityLog.create({
      type: ActivityType.CONTENT_UPDATED,
      severity: ActivitySeverity.INFO,
      userId: adminId,
      description: `News article updated: ${article.title}`,
      module: "web-admin",
      action: "update-news",
      ipAddress: "",
      metadata: { newsId: article._id, changes: Object.keys(dto) },
    });

    logger.info(`News article updated: ${article.title}`);
    return article;
  }

  async setPublished(
    newsId: string,
    adminId: mongoose.Types.ObjectId,
    isPublished: boolean
  ): Promise<INews> {
    const article = await this.getNewsById(newsId);

    if (isPublished) {
      await article.publish();
    } else {
      await article.unpublish();
    }

    article.lastModifiedBy = adminId;
    await article.save();

    await ActivityLog.create({
      type: ActivityType.CONTENT_UPDATED,
      severity: ActivitySeverity.INFO,
      userId: adminId,
      description: `News article ${
        isPublished ? "published" : "moved to drafts"
      }: ${article.title}`,
      module: "web-admin",
      action: isPublished ? "publish-news" : "unpublish-news",
      ipAddress: "",
      metadata: { newsId: article._id, isPublished },
    });

    return article;
  }

  async deleteNews(
    newsId: string,
    adminId: mongoose.Types.ObjectId
  ): Promise<void> {
    const article = await this.getNewsById(newsId);

    const title = article.title;
    const storedImages = [article.coverImage, ...(article.images || [])].filter(
      (url): url is string => Boolean(url)
    );

    await article.deleteOne();

    // Best-effort cleanup after the record is gone: a storage failure must not
    // leave an article that cannot be deleted.
    for (const url of storedImages) {
      if (!storageService.isStoredUrl?.(url)) continue;

      storageService.deleteImage(url).catch((error) => {
        logger.warn("Failed to delete news image from storage", {
          url,
          error: error instanceof Error ? error.message : error,
        });
      });
    }

    await ActivityLog.create({
      type: ActivityType.CONTENT_DELETED,
      severity: ActivitySeverity.WARNING,
      userId: adminId,
      description: `News article deleted: ${title}`,
      module: "web-admin",
      action: "delete-news",
      ipAddress: "",
      metadata: { newsId, title },
    });

    logger.info(`News article deleted: ${title}`);
  }
}

export const newsService = new NewsService();
