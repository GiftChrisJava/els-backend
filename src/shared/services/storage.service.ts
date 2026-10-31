import crypto from "crypto";
import fs from "fs";
import path from "path";
import { appConfig } from "../../config/app.config";
import { AppError } from "../errors/AppError";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif",
};
const MAX_BYTES = 10 * 1024 * 1024;

/** Server-only storage. CMS requests retain MongoDB authentication/roles. */
export class StorageService {
  private get config() { return appConfig.supabase; }

  private headers(): Record<string, string> {
    const key = this.config.secretKey;
    if (!key) throw new AppError("Supabase uploads are not configured. Set SUPABASE_SECRET_KEY on the backend.", 503);
    // New secret keys are not JWTs. Only legacy service-role JWTs use Bearer.
    return { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }) };
  }

  private publicPrefix(): string {
    return `${this.config.url}/storage/v1/object/public/${encodeURIComponent(this.config.bucket)}/`;
  }

  private objectPath(url: string): string | null {
    try {
      const candidate = new URL(url);
      const prefix = new URL(this.publicPrefix());
      if (candidate.origin !== prefix.origin || !candidate.pathname.startsWith(prefix.pathname)) return null;
      const parts = candidate.pathname.slice(prefix.pathname.length).split("/").map(decodeURIComponent);
      if (parts.some(part => !part || part === "." || part === ".." || /[\\/]/.test(part))) return null;
      return parts.join("/");
    } catch { return null; }
  }

  isStoredUrl(url: string): boolean { return this.objectPath(url) !== null; }

  async uploadImage(file: Express.Multer.File | Buffer, folder = "images", customFileName?: string): Promise<string> {
    const buffer = Buffer.isBuffer(file) ? file : file.buffer || fs.readFileSync(file.path);
    const mime = Buffer.isBuffer(file) ? "image/jpeg" : file.mimetype.toLowerCase();
    const extension = IMAGE_EXTENSIONS[mime];
    if (!extension) throw AppError.badRequest("Unsupported image type. Use JPEG, PNG, WebP or GIF.");
    if (!buffer.length || buffer.length > MAX_BYTES) throw AppError.badRequest("Images must be between 1 byte and 10 MB.");
    const segments = folder.split("/");
    if (segments.some(segment => !/^[a-zA-Z0-9_-]+$/.test(segment))) throw AppError.badRequest("Invalid storage folder.");
    const stem = (customFileName ? path.parse(customFileName).name : "image").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const objectPath = `${folder}/${crypto.randomUUID()}-${stem}.${extension}`;
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${this.config.url}/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${encodedPath}`, {
      method: "POST", headers: { ...this.headers(), "Content-Type": mime, "Cache-Control": "max-age=31536000", "x-upsert": "false" },
      body: new Uint8Array(buffer), signal: AbortSignal.timeout(60000), redirect: "error",
    });
    if (!response.ok) throw new AppError(`Supabase image upload failed (HTTP ${response.status}). Check the backend secret, bucket and upload limits.`, 502);
    return this.publicPrefix() + encodedPath;
  }

  async uploadMultipleImages(files: (Express.Multer.File | Buffer)[], folder?: string): Promise<string[]> {
    // Complete all uploads before cleanup so parallel successes cannot orphan files.
    const results = await Promise.allSettled(files.map(file => this.uploadImage(file, folder)));
    const urls = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failed) {
      await Promise.allSettled(urls.map(url => this.deleteImage(url)));
      throw failed.reason;
    }
    return urls;
  }

  async uploadImageFromUrl(imageUrl: string, folder?: string, customFileName?: string): Promise<string> {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") throw AppError.badRequest("Image URLs must use HTTPS.");
    // Editing existing content must not re-upload migrated or legacy Appwrite files.
    if (this.isStoredUrl(imageUrl) || url.hostname.endsWith(".appwrite.io")) return imageUrl;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: "error" });
    if (!response.ok) throw AppError.badRequest("Could not download the external image.");
    const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_EXTENSIONS[mime]) { await response.body?.cancel(); throw AppError.badRequest("External URL does not return a supported image."); }
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = response.body?.getReader();
    if (!reader) throw AppError.badRequest("External image is empty.");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); throw AppError.badRequest("External image exceeds 10 MB."); }
      chunks.push(value);
    }
    return this.uploadImage({ buffer: Buffer.concat(chunks), mimetype: mime } as Express.Multer.File, folder, customFileName);
  }

  async deleteImage(url: string): Promise<boolean> {
    const objectPath = this.objectPath(url);
    if (!objectPath) return false; // Never delete another provider/project/bucket.
    const response = await fetch(`${this.config.url}/storage/v1/object/${encodeURIComponent(this.config.bucket)}`, {
      method: "DELETE", headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [objectPath] }), signal: AbortSignal.timeout(30000), redirect: "error",
    });
    if (!response.ok) throw new AppError(`Supabase image cleanup failed (HTTP ${response.status}).`, 502);
    return true;
  }

  async deleteMultipleImages(urls: string[]): Promise<boolean> {
    await Promise.all(urls.map(url => this.deleteImage(url)));
    return true;
  }
}

export const storageService = new StorageService();
