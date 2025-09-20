import { Client, Storage, InputFile, ID } from "node-appwrite";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger.util";

class AppwriteService {
  private client: Client;
  private storage: Storage;
  private bucketId: string;
  private endpoint: string;
  private projectId: string;

  constructor() {
    this.endpoint =
      process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
    this.projectId = process.env.APPWRITE_PROJECT_ID || "";
    this.bucketId = process.env.APPWRITE_BUCKET_ID || "";

    if (!this.projectId) {
      throw new AppError("Appwrite project ID is required", 500);
    }

    if (!this.bucketId) {
      throw new AppError("Appwrite bucket ID is required", 500);
    }

    this.client = new Client()
      .setEndpoint(this.endpoint)
      .setProject(this.projectId);

    // Set API key for server-side authentication
    if (process.env.APPWRITE_API_KEY) {
      this.client.setKey(process.env.APPWRITE_API_KEY);
    }

    this.storage = new Storage(this.client);
  }

  /**
   * Upload a single image file to Appwrite storage
   * @param file - Express multer file object or file buffer
   * @param folder - Optional folder structure (e.g., 'staff', 'projects', 'landing-slides')
   * @returns Promise<string> - The public URL of the uploaded image
   */
  async uploadImage(
    file: Express.Multer.File | Buffer,
    folder?: string,
    customFileName?: string
  ): Promise<string> {
    try {
      let fileData: Buffer;
      let fileName: string;
      let mimeType: string;

      if (Buffer.isBuffer(file)) {
        fileData = file;
        fileName = customFileName || `image_${uuidv4()}.jpg`;
        mimeType = "image/jpeg"; // Default for buffer uploads
      } else {
        fileData = file.buffer || fs.readFileSync(file.path);
        fileName = file.originalname || `image_${uuidv4()}.jpg`;
        mimeType = file.mimetype || "image/jpeg";
      }

      // Add folder prefix to filename if provided
      if (folder) {
        fileName = `${folder}/${fileName}`;
      }

      // Upload file to Appwrite storage using InputFile for Node.js
      const inputFile = InputFile.fromBuffer(fileData, fileName);
      
      const uploadedFile = await this.storage.createFile(
        this.bucketId,
        ID.unique(), // Use Appwrite's ID generator
        inputFile
      );

      // Get the public URL for the uploaded file
      const fileUrl = this.storage.getFileView(this.bucketId, uploadedFile.$id);

      logger.info(`Image uploaded successfully: ${fileName}`, {
        fileId: uploadedFile.$id,
        fileName,
        size: uploadedFile.sizeOriginal,
      });

      return fileUrl.toString();
    } catch (error) {
      logger.error("Failed to upload image to Appwrite", {
        error: error instanceof Error ? error.message : "Unknown error",
        folder,
        fileName: customFileName,
      });

      throw new AppError(
        `Failed to upload image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Upload multiple images
   * @param files - Array of files to upload
   * @param folder - Optional folder structure
   * @returns Promise<string[]> - Array of public URLs
   */
  async uploadMultipleImages(
    files: (Express.Multer.File | Buffer)[],
    folder?: string
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) =>
        this.uploadImage(file, folder, `image_${index + 1}_${uuidv4()}`)
      );

      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      logger.error("Failed to upload multiple images", {
        error: error instanceof Error ? error.message : "Unknown error",
        folder,
        fileCount: files.length,
      });

      throw new AppError(
        `Failed to upload multiple images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Delete an image from Appwrite storage
   * @param fileUrl - The URL of the file to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteImage(fileUrl: string): Promise<boolean> {
    try {
      // Extract file ID from URL
      const fileId = this.extractFileIdFromUrl(fileUrl);

      if (!fileId) {
        throw new AppError("Invalid file URL - cannot extract file ID", 400);
      }

      await this.storage.deleteFile(this.bucketId, fileId);

      logger.info(`Image deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      logger.error("Failed to delete image from Appwrite", {
        error: error instanceof Error ? error.message : "Unknown error",
        fileUrl,
      });

      throw new AppError(
        `Failed to delete image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Delete multiple images
   * @param fileUrls - Array of file URLs to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteMultipleImages(fileUrls: string[]): Promise<boolean> {
    try {
      const deletePromises = fileUrls.map((url) => this.deleteImage(url));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      logger.error("Failed to delete multiple images", {
        error: error instanceof Error ? error.message : "Unknown error",
        urlCount: fileUrls.length,
      });

      throw new AppError(
        `Failed to delete multiple images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Extract file ID from Appwrite file URL
   * @param url - The Appwrite file URL
   * @returns string | null - The extracted file ID or null if not found
   */
  private extractFileIdFromUrl(url: string): string | null {
    try {
      // Appwrite file URLs typically follow the pattern:
      // https://cloud.appwrite.io/v1/storage/buckets/[bucketId]/files/[fileId]/view
      const urlParts = url.split("/");
      const viewIndex = urlParts.findIndex((part) => part === "view");

      if (viewIndex > 0) {
        return urlParts[viewIndex - 1]; // File ID is before "view"
      }

      // Alternative pattern extraction
      const fileIdMatch = url.match(/files\/([^\/]+)\/view/);
      return fileIdMatch ? fileIdMatch[1] : null;
    } catch (error) {
      logger.error("Failed to extract file ID from URL", { url, error });
      return null;
    }
  }

  /**
   * Get file details from Appwrite
   * @param fileId - The file ID
   * @returns Promise<any> - File details
   */
  async getFileDetails(fileId: string): Promise<any> {
    try {
      const file = await this.storage.getFile(this.bucketId, fileId);
      return file;
    } catch (error) {
      logger.error("Failed to get file details", {
        error: error instanceof Error ? error.message : "Unknown error",
        fileId,
      });

      throw new AppError(
        `Failed to get file details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Generate a preview URL for an image with specific dimensions
   * @param fileId - The file ID
   * @param width - Desired width
   * @param height - Desired height
   * @returns string - Preview URL
   */
  getImagePreview(fileId: string, width?: number, height?: number): string {
    const preview = this.storage.getFilePreview(
      this.bucketId,
      fileId,
      width,
      height
    );
    return preview.toString();
  }
}

export const appwriteService = new AppwriteService();
export { AppwriteService };
