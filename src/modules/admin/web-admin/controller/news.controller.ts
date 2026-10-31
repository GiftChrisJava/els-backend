import { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../../../shared/errors/AppError";
import { storageService } from "../../../../shared/services/storage.service";
import { asyncHandler } from "../../../../shared/utils/async-handler.util";
import { ResponseUtil } from "../../../../shared/utils/response.util";
import { newsService, NewsDto } from "../service/news.service";

type MulterFiles =
  | { [fieldname: string]: Express.Multer.File[] }
  | undefined;

/**
 * Uploads whatever images came with the request and merges the resulting URLs
 * into the payload.
 *
 * Absent file fields are left untouched, so an update that does not include a
 * new cover keeps the existing one.
 */
async function attachUploadedImages(
  files: MulterFiles,
  payload: Record<string, any>
): Promise<void> {
  if (!files) return;

  try {
    if (files.coverImage?.[0]) {
      payload.coverImage = await storageService.uploadImage(
        files.coverImage[0],
        "news"
      );
    }

    if (files.images?.length) {
      payload.images = await storageService.uploadMultipleImages(
        files.images,
        "news"
      );
    }
  } catch (error) {
    throw new AppError(
      `Failed to upload news images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      500
    );
  }
}

export class NewsController {
  /**
   * Admin listing: includes drafts.
   */
  getNews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      category,
      tag,
      featured,
      sortBy,
      sortOrder,
    } = req.query as Record<string, string>;

    const { articles, total, page: resolvedPage, limit: resolvedLimit } =
      await newsService.listNews(
        {
          search: search || undefined,
          status:
            status === "published" || status === "draft" ? status : undefined,
          category: category || undefined,
          tag: tag || undefined,
          isFeatured:
            featured === undefined || featured === ""
              ? undefined
              : featured === "true",
        },
        {
          page: Number(page),
          limit: Number(limit),
          sortBy,
          sortOrder: sortOrder === "asc" ? "asc" : "desc",
        },
        false
      );

    ResponseUtil.paginated(
      res,
      articles,
      resolvedPage,
      resolvedLimit,
      total,
      "News articles retrieved successfully"
    );
  });

  getNewsById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const article = await newsService.getNewsById(req.params.newsId);
      ResponseUtil.success(
        res,
        { news: article },
        "News article retrieved successfully"
      );
    }
  );

  createNews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const payload: Record<string, any> = { ...req.body };
      await attachUploadedImages(req.files as MulterFiles, payload);

      const article = await newsService.createNews(
        adminId as mongoose.Types.ObjectId,
        payload as NewsDto
      );

      ResponseUtil.created(
        res,
        { news: article },
        "News article created successfully"
      );
    }
  );

  updateNews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const payload: Record<string, any> = { ...req.body };
      await attachUploadedImages(req.files as MulterFiles, payload);

      const article = await newsService.updateNews(
        req.params.newsId,
        adminId as mongoose.Types.ObjectId,
        payload as Partial<NewsDto>
      );

      ResponseUtil.success(
        res,
        { news: article },
        "News article updated successfully"
      );
    }
  );

  setNewsPublished = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const isPublished = req.body.isPublished === true;

      const article = await newsService.setPublished(
        req.params.newsId,
        adminId as mongoose.Types.ObjectId,
        isPublished
      );

      ResponseUtil.success(
        res,
        { news: article },
        isPublished
          ? "News article published successfully"
          : "News article moved to drafts"
      );
    }
  );

  deleteNews = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await newsService.deleteNews(
        req.params.newsId,
        adminId as mongoose.Types.ObjectId
      );

      ResponseUtil.success(res, null, "News article deleted successfully");
    }
  );
}

export const newsController = new NewsController();
