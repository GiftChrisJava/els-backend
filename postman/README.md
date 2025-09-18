# Energy Solutions API - Postman Collection

This folder contains Postman collections and environments for testing the Energy Solutions API.

## Files

- `Energy-Solutions-API.postman_collection.json` - Complete API collection with all endpoints
- `Energy-Solutions-Development.postman_environment.json` - Development environment variables
- `Energy-Solutions-Production.postman_environment.json` - Production environment variables

## How to Use

1. Import the collection and environment files into Postman
2. Select the appropriate environment (Development or Production)
3. Update the environment variables with your specific values:
   - `baseURL`: API server URL
   - `userEmail` and `userPassword`: Regular user credentials
   - `adminEmail` and `adminPassword`: System admin credentials
   - `webAdminEmail` and `webAdminPassword`: Web admin credentials

## Authentication Flow

### System Admin Authentication

1. Run "Login Admin" request to get tokens
2. Tokens are automatically saved to environment variables
3. Use "Refresh Admin Token" when access token expires

### Web Admin Authentication

1. Run "Login Web Admin" request to get tokens
2. Tokens are automatically saved to environment variables
3. Use "Refresh Web Admin Token" when access token expires

### User Authentication

1. Run "Login User" request to get tokens
2. Tokens are automatically saved to environment variables
3. Use "Refresh User Token" when access token expires

## Collection Structure

### Authentication

- Admin login/logout/refresh
- Web admin login/logout/refresh
- User registration/login/logout/refresh
- Password reset functionality
- Email verification

### System Admin Management

- Activity logs viewing
- User management
- System statistics

### Web Admin Management

Complete content management system with CRUD operations for:

#### Services Management

- Create, read, update, delete services
- Upload service images
- Manage service status (draft, published, archived)
- Featured services management
- Service categories and pricing

#### Projects Management

- Create, read, update, delete projects
- Upload project images and documents
- Project status management
- Featured projects showcase
- Project categories and client information

#### Staff Management

- Add, edit, remove staff members
- Upload staff photos
- Manage staff roles and departments
- Social media links
- Staff bio and contact information

#### Testimonials Management

- Create, approve, reject testimonials
- Client testimonial moderation
- Featured testimonials selection
- Testimonial categories and ratings

#### Landing Page Slides

- Homepage slideshow management
- Upload slide images
- Slide ordering and status
- Call-to-action buttons
- Slide content and links

### Public Routes

Content access for website visitors:

#### Services

- Browse all published services
- View service details by slug
- Featured services listing
- Service categories
- Service search and filtering

#### Projects

- Browse all published projects
- View project details by slug
- Featured projects showcase
- Project categories
- Project gallery and documents

#### Staff

- View all active staff members
- Staff directory with departments
- Individual staff profiles
- Staff expertise and contact info

#### Testimonials

- Browse approved testimonials
- Featured testimonials display
- Client feedback showcase
- Testimonial categories

#### Landing Content

- Homepage slides for carousel
- Active slides with proper ordering
- Slide content for frontend display

#### Contact & Statistics

- Contact form submission
- Website statistics (anonymous)
- Public inquiries handling

## Environment Variables

### Base Configuration

- `baseURL`: API base URL
- `expiresIn`: Token expiration time

### System Admin

- `adminEmail`: System admin email
- `adminPassword`: System admin password
- `adminAccessToken`: JWT access token (auto-populated)
- `adminRefreshToken`: JWT refresh token (auto-populated)

### Web Admin

- `webAdminEmail`: Web admin email
- `webAdminPassword`: Web admin password
- `webAdminAccessToken`: JWT access token (auto-populated)
- `webAdminRefreshToken`: JWT refresh token (auto-populated)

### Regular User

- `userEmail`: Regular user email
- `userPassword`: Regular user password
- `userAccessToken`: JWT access token (auto-populated)
- `userRefreshToken`: JWT refresh token (auto-populated)

### Testing IDs (Auto-populated from responses)

- `serviceId`: Service ID for testing
- `serviceSlug`: Service slug for public testing
- `projectId`: Project ID for testing
- `projectSlug`: Project slug for public testing
- `staffId`: Staff member ID for testing
- `testimonialId`: Testimonial ID for testing
- `slideId`: Landing slide ID for testing

## Testing Workflow

### 1. Setup Phase

1. Import collection and environment
2. Update base URL and credentials
3. Run authentication requests to get tokens

### 2. Web Admin Testing

1. Login as web admin
2. Test content creation (services, projects, staff, etc.)
3. Upload images and files
4. Manage content status and visibility
5. Test approval workflows

### 3. Public Routes Testing

1. Test public content browsing
2. Verify published content visibility
3. Test search and filtering
4. Submit contact forms
5. Check public statistics

### 4. System Admin Testing

1. Login as system admin
2. Review activity logs
3. Manage user accounts
4. Check system statistics

## Important Notes

- All requests include proper authentication headers
- File uploads require multipart/form-data
- Images are automatically resized and optimized
- Slugs are auto-generated from titles
- Content goes through approval workflows
- Public routes only show approved/published content
- Environment variables are automatically updated from responses
- Use the pre-request scripts to ensure fresh tokens

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
