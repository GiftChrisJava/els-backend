import { Router } from "express";
import { rateLimiter } from "../../../shared/middlewares/rate-limit.middleware";
import { validateRequest } from "../../../shared/middlewares/validation.middleware";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import * as validators from "../validators/auth.validator";

const router = Router();
const authController = new AuthController();

// Public routes - with rate limiting
router.post(
  "/register",
  rateLimiter("register", 5, 15), // 5 requests per 15 minutes
  validateRequest(validators.registerSchema),
  authController.register
);

router.post(
  "/verify-email",
  rateLimiter("verify", 5, 15),
  validateRequest(validators.verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  "/login",
  rateLimiter("login", 5, 15),
  validateRequest(validators.loginSchema),
  authController.login
);

router.post(
  "/refresh-token",
  rateLimiter("refresh", 10, 15),
  validateRequest(validators.refreshTokenSchema),
  authController.refreshToken
);

router.post(
  "/resend-verification",
  rateLimiter("resend", 3, 15),
  validateRequest(validators.resendVerificationSchema),
  authController.resendVerificationCode
);

router.post(
  "/forgot-password",
  rateLimiter("forgot", 3, 15),
  validateRequest(validators.forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  rateLimiter("reset", 3, 15),
  validateRequest(validators.resetPasswordSchema),
  authController.resetPassword
);

// Protected routes - require authentication
router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.getCurrentUser);

router.patch(
  "/me",
  authenticate,
  validateRequest(validators.updateProfileSchema),
  authController.updateProfile
);

router.post(
  "/change-password",
  authenticate,
  rateLimiter("password-change", 3, 60), // 3 requests per hour
  validateRequest(validators.changePasswordSchema),
  authController.changePassword
);

export default router;
