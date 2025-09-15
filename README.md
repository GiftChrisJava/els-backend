# Energy Solutions Backend API

A comprehensive Node.js + MongoDB + TypeScript backend system for Energy Solutions, featuring multi-role authentication, admin management, and scalable architecture.

## 🚀 Features

### Phase 1 - Authentication (Complete)

- ✅ User registration with email verification (6-digit code)
- ✅ Secure login with JWT tokens
- ✅ Password reset functionality
- ✅ Session management
- ✅ Rate limiting
- ✅ Refresh token rotation

### Phase 2 - System Admin (Complete)

- ✅ Create and manage admin users
- ✅ Role-based access control (RBAC)
- ✅ User management (CRUD operations)
- ✅ Activity logging
- ✅ Dashboard statistics
- ✅ Bulk operations
- ✅ User export (CSV/JSON)

### Phase 3-6 (Upcoming)

- 🔄 Sales Admin functionality
- 🔄 Web Admin content management
- 🔄 Helpdesk support system
- 🔄 Customer portal
- 🔄 Product management
- 🔄 Order processing

## 📋 Prerequisites

- Node.js 18.x or higher
- MongoDB 5.0 or higher
- Redis (optional, for caching)
- Gmail account for email notifications

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Email**: Nodemailer
- **Storage**: Appwrite
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/energy-solutions-backend.git
cd energy-solutions-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configurations
nano .env
```

### 4. Configure Environment Variables

```env
# Application
NODE_ENV=development
PORT=5000
APP_NAME=Energy Solutions
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/energy_solutions

# JWT Secrets (Generate strong secrets for production)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# System Admin (Change these!)
SYSTEM_ADMIN_EMAIL=admin@energysolutions.mw
SYSTEM_ADMIN_PASSWORD=Admin@123456
```

### 5. Database Setup

```bash
# Start MongoDB
mongod --dbpath /path/to/your/data

# Run seeds (creates default admin accounts)
npm run seed
```

### 6. Start the server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## 🔑 Default Admin Credentials

After running the seed, the following admin accounts will be created:

| Role         | Email                        | Password       |
| ------------ | ---------------------------- | -------------- |
| System Admin | <admin@energysolutions.mw>   | Admin@123456   |
| Sales Admin  | <sales@energysolutions.mw>   | Sales@123456   |
| Web Admin    | <web@energysolutions.mw>     | Web@123456     |
| Helpdesk     | <support@energysolutions.mw> | Support@123456 |

⚠️ **Important**: Change these passwords immediately after first login!

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+265999123456",
  "company": "Example Corp"
}
```

#### Verify Email

```http
POST /auth/verify-email
Content-Type: application/json

{
  "code": "123456",
  "email": "user@example.com" // optional
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```

#### Refresh Token

```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer {access-token}
```

### System Admin Endpoints

#### Get Dashboard Stats

```http
GET /admin/system/dashboard
Authorization: Bearer {admin-token}
```

#### Get All Users

```http
GET /admin/system/users?page=1&limit=10&role=customer&status=active
Authorization: Bearer {admin-token}
```

#### Create Admin User

```http
POST /admin/system/users
Authorization: Bearer {system-admin-token}
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "Admin@123456",
  "firstName": "New",
  "lastName": "Admin",
  "role": "sales-admin",
  "phoneNumber": "+265999000005"
}
```

#### Update User

```http
PATCH /admin/system/users/{userId}
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "status": "active"
}
```

#### Suspend User

```http
POST /admin/system/users/{userId}/suspend
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "reason": "Violation of terms of service"
}
```

#### Get Activity Logs

```http
GET /admin/system/activity-logs?page=1&limit=20&severity=warning
Authorization: Bearer {admin-token}
```

## 🏗️ Project Structure

```
energy-solutions-backend/
├── src/
│   ├── config/         # Configuration files
│   ├── core/           # Core interfaces, types, constants
│   ├── modules/        # Feature modules
│   │   ├── auth/       # Authentication module
│   │   └── admin/      # Admin modules
│   │       ├── system-admin/
│   │       ├── sales-admin/
│   │       ├── web-admin/
│   │       └── helpdesk/
│   ├── shared/         # Shared utilities and middlewares
│   ├── database/       # Database seeds and migrations
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── tests/              # Test files
├── logs/               # Application logs
├── public/             # Static files
└── dist/               # Compiled JavaScript
```

## 🔒 Security Features

- **Password Requirements**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Rate Limiting**: Prevents brute force attacks
- **JWT Token Rotation**: Secure token refresh mechanism
- **MongoDB Injection Prevention**: Input sanitization
- **CORS Configuration**: Controlled cross-origin access
- **Helmet.js**: Security headers
- **HTTPS Support**: SSL/TLS ready
- **Session Management**: Automatic cleanup of expired sessions
- **Activity Logging**: Audit trail for all admin actions

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📈 Monitoring

The application includes built-in health checks:

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

## 🚢 Deployment

### Production Build

```bash
npm run build
```

### Environment Variables for Production

- Use strong, unique passwords
- Enable HTTPS
- Configure production MongoDB URI
- Set NODE_ENV=production
- Use environment-specific email credentials

### Recommended Hosting

- **Server**: AWS EC2, DigitalOcean, Heroku
- **Database**: MongoDB Atlas
- **Storage**: Appwrite Cloud
- **Email**: SendGrid, AWS SES

## 🛡️ Role Permissions

| Role             | Permissions                                                         |
| ---------------- | ------------------------------------------------------------------- |
| **System Admin** | Full system access, create/delete admins, system settings           |
| **Sales Admin**  | Manage products, orders, view analytics, customer management        |
| **Web Admin**    | Manage website content, services, testimonials, staff profiles      |
| **Helpdesk**     | View support tickets, respond to inquiries, customer communications |
| **Customer**     | View products, place orders, submit support tickets                 |

## 📝 License

This project is proprietary software for Energy Solutions.

## 🤝 Support

For support, email <support@energysolutions.mw>

## 👥 Development Team

- System Architecture: Energy Solutions Dev Team
- Backend Development: Node.js Team
- Database Design: MongoDB Team

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: Phase 1 & 2 Complete
