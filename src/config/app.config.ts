import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/**
 * Loads the first env file that exists.
 *
 * This project keeps its local config in `els-backend.env`, but only `.env`
 * was ever loaded - so locally every value below silently fell back to its
 * hardcoded default, including `JWT_SECRET`. Tokens were being signed with
 * "default-secret-change-this", which is public in this file.
 *
 * On the hosting platform the variables are injected into `process.env`
 * directly and no file is needed, so a missing file is not an error.
 */
const projectRoot = path.join(__dirname, "../..");
const candidateEnvFiles = [".env", "els-backend.env"];

for (const filename of candidateEnvFiles) {
  const candidate = path.join(projectRoot, filename);
  if (fs.existsSync(candidate)) {
    // `override: false` keeps real platform variables authoritative over a
    // stale local file.
    dotenv.config({ path: candidate, override: false });
  }
}

/**
 * Fails fast on a secret that was never configured.
 *
 * A default JWT secret in production means anyone reading this repository can
 * mint valid admin tokens, so refuse to boot rather than run insecurely.
 */
function requireSecret(name: string, value: string | undefined): string {
  if (value && value.trim()) {
    return value;
  }

  const message =
    `${name} is not set. Set it in the environment (or in ` +
    `els-backend.env for local development) before starting the server.`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }

  console.warn(
    `[config] ${message} Falling back to an insecure development value.`
  );
  return `insecure-dev-${name.toLowerCase()}`;
}

export const appConfig = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  appName: process.env.APP_NAME || "Energy Solutions",
  appUrl: (process.env.APP_URL || "https://esl-api.onrender.com").replace(/\/+$/, ""),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  jwt: {
    secret: requireSecret("JWT_SECRET", process.env.JWT_SECRET),
    refreshSecret: requireSecret(
      "JWT_REFRESH_SECRET",
      process.env.JWT_REFRESH_SECRET
    ),
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
    // Trimmed and de-duplicated: the configured value contains an entry with a
    // leading space (", https://...") which could never match an Origin header,
    // and a trailing slash makes an origin fail an exact comparison.
    origins: (process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:3000"])
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => origin.length > 0),
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
