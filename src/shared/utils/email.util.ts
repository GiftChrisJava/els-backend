import nodemailer, { Transporter } from "nodemailer";
import { getWelcomeTemplate } from "../../shared/templates/emails/welcome.template";
import { appConfig } from "./../../config/app.config";
import { getPasswordResetTemplate } from "./../../shared/templates/emails/password-reset.template";
import { getVerificationTemplate } from "./../../shared/templates/emails/verification.template";
import { logger } from "./logger.util";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: any[];
}

export class EmailUtil {
  private transporter: Transporter;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = this.validateConfig();

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: appConfig.email.host,
        port: appConfig.email.port,
        secure: appConfig.email.secure,
        auth: {
          user: appConfig.email.user,
          pass: appConfig.email.password,
        },
      });

      // Verify transporter configuration
      this.verifyTransporter();
    } else {
      logger.warn("Email service not configured. Emails will be logged only.");
    }
  }

  private validateConfig(): boolean {
    return !!(
      appConfig.email.host &&
      appConfig.email.port &&
      appConfig.email.user &&
      appConfig.email.password
    );
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info("Email transporter configured successfully");
    } catch (error) {
      logger.error("Email transporter verification failed:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.isConfigured) {
        // Log email content in development
        if (appConfig.isDevelopment()) {
          logger.info("Email (not sent - no config):", {
            to: options.to,
            subject: options.subject,
            preview: options.text?.substring(0, 100),
          });
        }
        return;
      }

      const mailOptions = {
        from: appConfig.email.from,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Email sent successfully:", {
        messageId: info.messageId,
        to: options.to,
      });
    } catch (error) {
      logger.error("Failed to send email:", error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const html = getVerificationTemplate(code);

    await this.sendEmail({
      to: email,
      subject: "Verify Your Email - Energy Solutions",
      html,
      text: `Your verification code is: ${code}. This code will expire in 15 minutes.`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    const html = getPasswordResetTemplate(code);

    await this.sendEmail({
      to: email,
      subject: "Password Reset Request - Energy Solutions",
      html,
      text: `Your password reset code is: ${code}. This code will expire in 15 minutes. If you didn't request this, please ignore this email.`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = getWelcomeTemplate(firstName);

    await this.sendEmail({
      to: email,
      subject: "Welcome to Energy Solutions!",
      html,
      text: `Welcome to Energy Solutions, ${firstName}! We're excited to have you on board.`,
    });
  }

  async sendTwoFactorEmail(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Two-Factor Authentication</h2>
        <p>Your two-factor authentication code is:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this code, please secure your account immediately.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: "Two-Factor Authentication Code - Energy Solutions",
      html,
      text: `Your two-factor authentication code is: ${code}. This code will expire in 5 minutes.`,
    });
  }

  async sendOrderConfirmationEmail(
    email: string,
    orderDetails: any
  ): Promise<void> {
    // Implementation for order confirmation
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Order Number: <strong>${orderDetails.orderNumber}</strong></p>
        <p>Total Amount: <strong>MWK ${orderDetails.totalAmount}</strong></p>
        <p>We'll send you an update when your order ships.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderDetails.orderNumber} - Energy Solutions`,
      html,
      text: `Order confirmed! Order Number: ${orderDetails.orderNumber}, Total: MWK ${orderDetails.totalAmount}`,
    });
  }

  async sendAdminWelcomeEmail(
    email: string,
    firstName: string,
    temporaryPassword: string,
    role: string
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">Welcome to Energy Solutions Admin Panel</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hello ${firstName},</h2>
          <p>Your admin account has been created successfully. You have been assigned the role of <strong>${role}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
          </div>
          
          <p>Login URL: <a href="${appConfig.frontendUrl}/admin/login">${
      appConfig.frontendUrl
    }/admin/login</a></p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions or need assistance, please contact the system administrator.
          </p>
        </div>
        <div style="background: #333; color: #999; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Energy Solutions. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: "Welcome to Energy Solutions Admin Panel",
      html,
      text: `Welcome ${firstName}! Your admin account (${role}) has been created. Email: ${email}, Temporary Password: ${temporaryPassword}. Please change your password after first login.`,
    });
  }

  async sendAdminNotificationEmail(
    subject: string,
    content: string
  ): Promise<void> {
    // Send to all system admins
    const adminEmail = appConfig.systemAdmin.email;

    await this.sendEmail({
      to: adminEmail,
      subject: `[Admin Alert] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b6b;">Admin Notification</h2>
          <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #ff6b6b;">
            ${content}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated notification from Energy Solutions system.
          </p>
        </div>
      `,
      text: content,
    });
  }
}
