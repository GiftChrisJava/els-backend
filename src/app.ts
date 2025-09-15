import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import morgan from "morgan";
import { appConfig } from "./config/app.config";
import { errorHandler } from "./shared/middlewares/error.middleware";
import { notFoundHandler } from "./shared/middlewares/not-found.middleware";
import { rateLimiter } from "./shared/middlewares/rate-limit.middleware";
import { loggerStream } from "./shared/utils/logger.util";

// Extend Express Request interface to include 'id'
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Import routes
import systemAdminRoutes from "./modules/admin/system-admin/routes/system-admin.routes";
import authRoutes from "./modules/auth/routes/auth.routes";

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: !appConfig.isDevelopment(),
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or Postman)
          if (!origin) return callback(null, true);

          if (appConfig.cors.origins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Device-Info",
        ],
        exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit"],
        maxAge: 86400, // 24 hours
      })
    );

    // Body parsing middlewares
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(cookieParser());

    // MongoDB query sanitization
    this.app.use(
      mongoSanitize({
        replaceWith: "_",
        onSanitize: ({ req, key }) => {
          console.warn(`Attempted NoSQL injection blocked in ${key}`);
        },
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (appConfig.isDevelopment()) {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined", { stream: loggerStream }));
    }

    // Global rate limiting
    this.app.use("/api", rateLimiter("global", 100, 15));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next) => {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader("X-Request-Id", req.id);
      next();
    });

    // Trust proxy
    this.app.set("trust proxy", 1);

    // Disable X-Powered-By header
    this.app.disable("x-powered-by");
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: appConfig.env,
        version: process.env.npm_package_version || "1.0.0",
      });
    });

    // API version endpoint
    this.app.get("/api", (req: Request, res: Response) => {
      res.json({
        name: appConfig.appName,
        version: "1.0.0",
        description: "Energy Solutions Backend API",
        documentation: "/api/docs",
        endpoints: {
          auth: "/api/v1/auth",
          admin: "/api/v1/admin",
          products: "/api/v1/products",
          orders: "/api/v1/orders",
          support: "/api/v1/support",
        },
      });
    });

    // API v1 routes
    this.app.use("/api/v1/auth", authRoutes);
    this.app.use("/api/v1/admin/system", systemAdminRoutes);

    // Future routes (Phase 3-6)
    // this.app.use('/api/v1/admin/sales', salesAdminRoutes);
    // this.app.use('/api/v1/admin/web', webAdminRoutes);
    // this.app.use('/api/v1/admin/helpdesk', helpdeskRoutes);
    // this.app.use('/api/v1/products', productRoutes);
    // this.app.use('/api/v1/orders', orderRoutes);
    // this.app.use('/api/v1/customers', customerRoutes);
    // this.app.use('/api/v1/support', supportRoutes);

    // Static files (if needed)
    this.app.use("/uploads", express.static("public/uploads"));
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`
        ################################################
        🚀 Server is running on port ${port}
        🌍 Environment: ${appConfig.env}
        📱 API URL: ${appConfig.appUrl}
        ################################################
      `);
    });
  }
}

export default new App().app;
