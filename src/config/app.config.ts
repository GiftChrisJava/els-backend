import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

export const appConfig = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  appName: process.env.APP_NAME || "Energy Solutions",
  appUrl: process.env.APP_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-change-this",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-this",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  database: {
    uri:
      process.env.MONGODB_URI || "mongodb://localhost:27017/energy_solutions",
    testUri:
      process.env.MONGODB_TEST_URI ||
      "mongodb://localhost:27017/energy_solutions_test",
  },

  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER || "energysolutionsltd24@gmail.com",
    password: process.env.EMAIL_PASSWORD || "",
    from:
      process.env.EMAIL_FROM ||
      '"Energy Solutions Customer Support" <energysolutionsltd24@gmail.com>',
  },

  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
    projectId: process.env.APPWRITE_PROJECT_ID || "",
    apiKey: process.env.APPWRITE_API_KEY || "",
    bucketId: process.env.APPWRITE_BUCKET_ID || "",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
  },

  systemAdmin: {
    email: process.env.SYSTEM_ADMIN_EMAIL || "energysolutionsltd24@gmail.com",
    password: process.env.SYSTEM_ADMIN_PASSWORD || "Admin@123456",
    firstName: process.env.SYSTEM_ADMIN_FIRST_NAME || "System",
    lastName: process.env.SYSTEM_ADMIN_LAST_NAME || "Administrator",
  },

  verification: {
    codeLength: 6,
    expiryMinutes: 15,
    maxAttempts: 3,
  },

  isDevelopment(): boolean {
    return this.env === "development";
  },

  isProduction(): boolean {
    return this.env === "production";
  },

  isTest(): boolean {
    return this.env === "test";
  },
};
