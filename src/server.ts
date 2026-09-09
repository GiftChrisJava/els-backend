// Environment loading lives in ./config/app.config, which is imported below
// and resolves whichever env file is present. A second dotenv call here read a
// `.env` that this project does not have, and ran after the imports had
// already been evaluated, so it never did anything.
import app from "./app";
import { appConfig } from "./config/app.config";
import { DatabaseConnection } from "./config/database.config";
import { seedAdmins } from "./database/seeds/admin.seed";
import { Session } from "./modules/auth/models/session.model";
import { logger } from "./shared/utils/logger.util";

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", error);
  process.exit(1);
});

// Handle unhandled promise rejectionsser
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", {
    reason,
    promise,
  });
  process.exit(1);
});

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    const db = DatabaseConnection.getInstance();
    await db.connect();

    // Run initial seeds in development
    if (appConfig.isDevelopment()) {
      const { User } = await import("../src/modules/auth/models/user.model");
      const adminCount = await User.countDocuments({
        role: { $ne: "customer" },
      });

      if (adminCount === 0) {
        logger.info("No admins found. Running seed...");
        await seedAdmins();
      }
    }

    // Start cleanup jobs
    startCleanupJobs();

    // Start the server. Taken from the parsed config so an unset PORT falls
    // back to a known default instead of `undefined`, which makes
    // `app.listen` bind an arbitrary free port.
    const PORT = appConfig.port;

    logger.info(`Starting server on port ${PORT}`);
    const server = app.listen(PORT, () => {
      logger.info(`
        ################################################
        🚀 Server is running!
        📱 API URL: ${appConfig.appUrl}
        🌍 Environment: ${appConfig.env}
        🔌 Database: Connected
        📧 Email Service: ${
          appConfig.email.host ? "Configured" : "Not Configured"
        }
        💾 Appwrite Storage: ${
          appConfig.appwrite.endpoint ? "Configured" : "Not Configured"
        }
        ################################################
      `);

      if (appConfig.isDevelopment()) {
        // The seeded password is deliberately not logged - console output ends
        // up in shared terminals, CI output and scrollback.
        logger.info(`
        📚 API Documentation: ${appConfig.appUrl}/api
        🔑 Seeded system admin: ${appConfig.systemAdmin.email}
           (password comes from SYSTEM_ADMIN_PASSWORD)
        `);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        // Close database connection
        const db = DatabaseConnection.getInstance();
        await db.disconnect();

        logger.info("Database connection closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

function startCleanupJobs(): void {
  // Clean up expired sessions every hour
  setInterval(async () => {
    try {
      const deletedSessions = await Session.cleanupExpiredSessions();
      if (deletedSessions > 0) {
        logger.info(`Cleaned up ${deletedSessions} expired sessions`);
      }
    } catch (error) {
      logger.error("Session cleanup failed:", error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Clean up expired verifications every 6 hours
  setInterval(async () => {
    try {
      const { VerificationService } = await import(
        "../src/modules/auth/services/verification.service"
      );
      const verificationService = new VerificationService();
      const deleted = await verificationService.cleanupExpiredVerifications();
      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} expired verifications`);
      }
    } catch (error) {
      logger.error("Verification cleanup failed:", error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

// Start the server
startServer();
