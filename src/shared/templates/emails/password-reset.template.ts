export const getPasswordResetTemplate = (code: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Energy Solutions</h1>
                  <p style="margin: 10px 0 0 0; color: #ffe0e0; font-size: 14px;">Password Reset Request</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600; text-align: center;">Reset Your Password</h2>
                  
                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;">
                    We received a request to reset your password. Use the code below to complete the process:
                  </p>
                  
                  <!-- Reset Code Box -->
                  <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
                    <div style="font-size: 36px; font-weight: bold; color: #333333; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </div>
                  
                  <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #721c24; font-size: 14px;">
                      <strong>Security Notice:</strong> This code will expire in 15 minutes. If you didn't request this reset, please secure your account immediately.
                    </p>
                  </div>
                  
                  <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    For security reasons, we recommend changing your password regularly and using a strong, unique password for your account.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0;">
                  
                  <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                    Need help? Contact our support team at support@energysolutions.mw
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} Energy Solutions. All rights reserved.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    This is an automated message, please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
