import multer from "multer";
import { AppError } from "../errors/AppError";

// File type validation
const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// File size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10; // Maximum number of files per upload

// Memory storage configuration (files will be stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check file type
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed types: ${allowedImageTypes.join(", ")}`,
        400
      )
    );
  }
};

// Multer configuration for single image upload
export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("image");

// Multer configuration for multiple image uploads
export const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
}).array("images", MAX_FILES);

// Multer configuration for staff profile image
export const uploadStaffProfileImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("profileImage");

// Multer configuration for project images (featured + gallery)
export const uploadProjectImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES + 1, // +1 for featured image
  },
}).fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "galleryImages", maxCount: MAX_FILES },
  { name: "beforeImages", maxCount: MAX_FILES },
  { name: "afterImages", maxCount: MAX_FILES },
]);

// Multer configuration for service icon
export const uploadServiceIcon = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("icon");

// Multer configuration for service images (main image + gallery)
export const uploadServiceImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES + 1, // +1 for main image
  },
}).fields([
  { name: "image", maxCount: 1 },
  { name: "galleryImages", maxCount: MAX_FILES },
]);

// Multer configuration for landing slide image
export const uploadLandingSlideImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("slideImage");

// Multer configuration for testimonial avatar
export const uploadTestimonialAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("avatar");

// Multer configuration for client logo
export const uploadClientLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).single("clientLogo");

// Error handling middleware for multer errors
export const handleMulterError = (
  error: any,
  req: any,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: `Too many files. Maximum is ${MAX_FILES} files`,
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected file field",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error: " + error.message,
        });
    }
  }
  next(error);
};

export { allowedImageTypes, MAX_FILE_SIZE, MAX_FILES };
