export const getWelcomeTemplate = (firstName: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Energy Solutions</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to Energy Solutions!</h1>
                  <p style="margin: 10px 0 0 0; color: #e0ffe0; font-size: 14px;">Your journey to sustainable energy starts here</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Hello ${firstName}! 👋</h2>
                  
                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                    We're thrilled to have you join the Energy Solutions family! Your account has been successfully created and you're all set to explore our range of energy products and services.
                  </p>
                  
                  <!-- Features Section -->
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 30px 0;">
                    <h3 style="margin: 0 0 20px 0; color: #333333; font-size: 18px;">What you can do now:</h3>
                    
                    <div style="margin-bottom: 20px;">
                      <div style="display: flex; align-items: start; margin-bottom: 15px;">
                        <span style="color: #43e97b; font-size: 20px; margin-right: 10px;">✓</span>
                        <div>
                          <strong style="color: #333333;">Browse Products</strong>
                          <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Explore our wide range of solar panels, batteries, and inverters</p>
                        </div>
                      </div>
                      
                      <div style="display: flex; align-items: start; margin-bottom: 15px;">
                        <span style="color: #43e97b; font-size: 20px; margin-right: 10px;">✓</span>
                        <div>
                          <strong style="color: #333333;">Request Quotes</strong>
                          <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Get personalized quotes for your energy needs</p>
                        </div>
                      </div>
                      
                      <div style="display: flex; align-items: start; margin-bottom: 15px;">
                        <span style="color: #43e97b; font-size: 20px; margin-right: 10px;">✓</span>
                        <div>
                          <strong style="color: #333333;">Track Orders</strong>
                          <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Monitor your orders from placement to delivery</p>
                        </div>
                      </div>
                      
                      <div style="display: flex; align-items: start;">
                        <span style="color: #43e97b; font-size: 20px; margin-right: 10px;">✓</span>
                        <div>
                          <strong style="color: #333333;">Get Support</strong>
                          <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Our team is here to help with any questions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${
                      process.env.FRONTEND_URL
                    }/products" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px;">Start Shopping</a>
                  </div>
                  
                  <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #155724; font-size: 14px;">
                      <strong>Pro Tip:</strong> Complete your profile to receive personalized recommendations and exclusive offers!
                    </p>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0;">
                  
                  <!-- Contact Info -->
                  <div style="text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 16px;">Need Help?</h3>
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                      📧 Email: support@energysolutions.mw
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                      📞 Phone: +265 999 123 456
                    </p>
                    <p style="margin: 0; color: #666666; font-size: 14px;">
                      🕐 Hours: Monday - Friday, 8:00 AM - 5:00 PM
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} Energy Solutions. All rights reserved.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Blantyre, Malawi | Powering Your Future
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
