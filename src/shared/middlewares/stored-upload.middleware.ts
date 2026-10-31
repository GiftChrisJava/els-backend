import { RequestHandler } from "express";
import { storageService } from "../services/storage.service";

/** Attach public URLs before validation, including nested slide media. */
export function storeUploadedFiles(fields: Record<string, { path: string; folder: string; multiple?: boolean }>): RequestHandler {
  return async (req, _res, next) => {
    try {
      for (const [field, target] of Object.entries(fields)) {
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const uploaded = files?.[field] || (req.file?.fieldname === field ? [req.file] : []);
        if (!uploaded.length) continue;
        const url = target.multiple
          ? await storageService.uploadMultipleImages(uploaded, target.folder)
          : await storageService.uploadImage(uploaded[0], target.folder);
        const keys = target.path.split(".");
        let body = req.body;
        for (const key of keys.slice(0, -1)) body = body[key] ||= {};
        body[keys[keys.length - 1]] = url;
        // Controllers must not upload an already handled file a second time.
        if (req.file && uploaded.includes(req.file)) req.file = undefined;
        if (files) delete files[field];
      }
      next();
    } catch (error) { next(error); }
  };
}
