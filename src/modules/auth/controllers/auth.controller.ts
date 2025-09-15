import { AppError } from "@shared/errors/AppError";
import { asyncHandler } from "@shared/utils/async-handler.util";
import { ResponseUtil } from "@shared/utils/response.util";
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, password, firstName, lastName, phoneNumber, company } =
        req.body;

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        company,
      });

      ResponseUtil.created(
        res,
        {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
          },
        },
        result.message
      );
    }
  );

  verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code, email } = req.body;

      const result = await this.authService.verifyEmail({ code, email });

      // Set cookies for tokens
      this.setTokenCookies(res, result.tokens);

      ResponseUtil.success(
        res,
        {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            emailVerified: result.user.emailVerified,
          },
          tokens: {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
          },
        },
        "Email verified successfully"
      );
    }
  );

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const loginData = {
      email,
      password,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      deviceInfo: req.get("x-device-info"),
    };

    const result = await this.authService.login(loginData);

    // Set cookies for tokens
    this.setTokenCookies(res, result.tokens);

    ResponseUtil.success(
      res,
      {
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          fullName: result.user.fullName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          profileImage: result.user.profileImage,
          company: result.user.company,
        },
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        },
      },
      "Login successful"
    );
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token = this.extractToken(req);

    if (token) {
      await this.authService.logout(token);
    }

    // Clear cookies
    this.clearTokenCookies(res);

    ResponseUtil.success(res, null, "Logged out successfully");
  });

  refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw AppError.badRequest("Refresh token is required");
      }

      const result = await this.authService.refreshToken(refreshToken);

      // Set new cookies
      this.setTokenCookies(res, result.tokens);

      ResponseUtil.success(
        res,
        {
          tokens: {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
          },
        },
        "Token refreshed successfully"
      );
    }
  );

  resendVerificationCode = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;

      await this.authService.resendVerificationCode(email);

      ResponseUtil.success(res, null, "Verification code sent successfully");
    }
  );

  forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;

      await this.authService.forgotPassword(email);

      ResponseUtil.success(
        res,
        null,
        "If this email is registered, a password reset code will be sent"
      );
    }
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { code, email, newPassword } = req.body;

      await this.authService.resetPassword({ code, email, newPassword });

      ResponseUtil.success(
        res,
        null,
        "Password reset successfully. Please login with your new password"
      );
    }
  );

  getCurrentUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?._id;

      if (!userId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const user = await this.authService.getCurrentUser(userId);

      ResponseUtil.success(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            company: user.company,
            address: user.address,
            createdAt: user.createdAt,
          },
        },
        "User retrieved successfully"
      );
    }
  );

  updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?._id;
      const updates = req.body;

      if (!userId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Prevent updating sensitive fields
      delete updates.email;
      delete updates.password;
      delete updates.role;
      delete updates.status;
      delete updates.emailVerified;

      const user = await this.authService.updateProfile(userId, updates);

      ResponseUtil.success(
        res,
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            company: user.company,
            address: user.address,
          },
        },
        "Profile updated successfully"
      );
    }
  );

  changePassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?._id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      ResponseUtil.success(res, null, "Password changed successfully");
    }
  );

  // Helper methods
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return req.cookies?.accessToken || null;
  }

  private setTokenCookies(res: Response, tokens: any): void {
    // Access token cookie (httpOnly, secure in production)
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: tokens.expiresIn * 1000,
    });

    // Refresh token cookie (httpOnly, secure in production)
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: tokens.refreshExpiresIn * 1000,
    });
  }

  private clearTokenCookies(res: Response): void {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  }
}
