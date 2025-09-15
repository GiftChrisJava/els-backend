# Postman Collection for Energy Solutions API

This directory contains Postman collections and environments for testing the Energy Solutions Backend API.

## Files Included

### Collections
- `Energy-Solutions-API.postman_collection.json` - Main API collection with all endpoints

### Environments
- `Energy-Solutions-Development.postman_environment.json` - Development environment variables
- `Energy-Solutions-Production.postman_environment.json` - Production environment variables

## Quick Setup

### 1. Import Collection and Environments
1. Open Postman
2. Click **Import** button
3. Select all JSON files in this directory
4. Import them into your Postman workspace

### 2. Select Environment
- Choose **Energy Solutions - Development** for local testing
- Choose **Energy Solutions - Production** for production testing

### 3. Update Environment Variables
Update the following variables as needed:
- `testEmail` - Your test user email
- `testPassword` - Your test user password
- `adminEmail` - Admin email (default: admin@energysolutions.mw)
- `adminPassword` - Admin password (default: Admin@123456)

## Authentication Flow

### For Regular Users
1. **Register User** - Creates a new user account
2. **Verify Email** - Verify email with 6-digit code (check your email)
3. **Login** - Authenticate and get tokens
4. Use authenticated endpoints

### For Admin Users
1. **Admin Login** - Login with admin credentials
2. Use admin endpoints

## Endpoint Categories

### 🔐 Authentication
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/verify-email` - Verify email address
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/refresh-token` - Refresh access token
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/reset-password` - Reset password with code
- **POST** `/api/auth/resend-verification` - Resend verification code
- **GET** `/api/auth/me` - Get current user profile
- **PATCH** `/api/auth/me` - Update user profile
- **POST** `/api/auth/change-password` - Change password
- **POST** `/api/auth/logout` - Logout user

### 👨‍💼 System Admin
- **GET** `/api/admin/system/dashboard` - Dashboard statistics
- **GET** `/api/admin/system/health` - System health check
- **GET** `/api/admin/system/users` - Get all users with filters
- **GET** `/api/admin/system/users/:id` - Get user by ID
- **POST** `/api/admin/system/users` - Create new admin
- **PATCH** `/api/admin/system/users/:id` - Update user
- **DELETE** `/api/admin/system/users/:id` - Delete user
- **POST** `/api/admin/system/users/:id/suspend` - Suspend user
- **POST** `/api/admin/system/users/:id/activate` - Activate user
- **PATCH** `/api/admin/system/users/:id/role` - Change user role
- **POST** `/api/admin/system/users/bulk-update` - Bulk update users
- **GET** `/api/admin/system/users/export` - Export users (CSV/JSON)
- **GET** `/api/admin/system/activity-logs` - Get activity logs

### 🏥 Health Check
- **GET** `/health` - Basic health check
- **GET** `/api` - API information

## Automatic Token Management

The collection includes automatic token management:
- Tokens are automatically extracted from login responses
- Tokens are automatically used in subsequent requests
- Both user and admin tokens are managed separately

## Environment Variables

### Base Configuration
- `baseUrl` - API base URL
- `apiVersion` - API version

### Authentication
- `accessToken` - Current user access token
- `refreshToken` - Current user refresh token
- `adminAccessToken` - Admin access token
- `adminRefreshToken` - Admin refresh token

### Test Data
- `testEmail` - Test user email
- `testPassword` - Test user password
- `adminEmail` - Admin email
- `adminPassword` - Admin password
- `verificationCode` - Email verification code
- `resetCode` - Password reset code

### User IDs
- `userId` - Current user ID
- `adminUserId` - Admin user ID
- `newAdminId` - Newly created admin ID

## Testing Workflow

### 1. User Registration Flow
1. Run **Register User**
2. Check email for verification code
3. Update `verificationCode` variable
4. Run **Verify Email**
5. Access token will be automatically set

### 2. User Login Flow
1. Run **Login** request
2. Tokens will be automatically set
3. Use authenticated endpoints

### 3. Admin Testing Flow
1. Run **Admin Login**
2. Admin tokens will be automatically set
3. Test admin endpoints

### 4. Password Reset Flow
1. Run **Forgot Password**
2. Check email for reset code
3. Update `resetCode` variable
4. Run **Reset Password**

## Rate Limiting

Be aware of rate limits:
- Login: 5 requests per 15 minutes
- Register: 5 requests per 15 minutes
- Password operations: 3 requests per 15-60 minutes
- Verification: 5 requests per 15 minutes

## Error Responses

All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Success Responses

All endpoints return consistent success responses:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Tips

1. **Sequential Testing**: Use the **Run Collection** feature to test all endpoints sequentially
2. **Environment Switching**: Easily switch between development and production environments
3. **Token Refresh**: Use the refresh token endpoint when access tokens expire
4. **Bulk Operations**: Test bulk operations with multiple user IDs
5. **Export Testing**: Test CSV and JSON export formats

## Security Notes

⚠️ **Important**: 
- Never commit production credentials to version control
- Update default passwords before production use
- Use environment-specific configurations
- Regularly rotate API credentials

## Support

For issues or questions about the API:
- Check the API documentation
- Review error responses for details
- Contact the development team

Happy testing! 🚀