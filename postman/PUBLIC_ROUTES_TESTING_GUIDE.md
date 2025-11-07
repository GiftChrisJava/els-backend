# Public Routes API Testing Guide

This guide explains how to use the **Public-Routes-API.postman_collection.json** to test all public endpoints in the Energy Solutions Backend API.

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Collection Structure](#collection-structure)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Environment Variables](#environment-variables)

---

## Overview

The Public Routes API collection provides comprehensive testing for all publicly accessible endpoints in the application. These routes do NOT require authentication and are designed for public consumption by the frontend application.

### Endpoints Covered

- **Services** (7 tests)
- **Projects** (5 tests)
- **Staff** (6 tests)
- **Testimonials** (8 tests)
- **Landing Slides** (3 tests)
- **Statistics** (1 test)
- **Contact Form** (6 tests)

**Total:** 36 test requests

---

## Setup Instructions

### 1. Import the Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select the file: `postman/Public-Routes-API.postman_collection.json`
4. Click **Import**

### 2. Import Environment (Optional)

You can use the existing environment files or create a new one:

- `Energy-Solutions-Development.postman_environment.json` (for local development)
- `Energy-Solutions-Production.postman_environment.json` (for production)

Or create a new environment with these variables:

```json
{
  "baseUrl": "http://localhost:5000",
  "apiVersion": "v1"
}
```

### 3. Ensure Server is Running

Before testing, make sure your backend server is running:

```bash
npm run dev
```

The server should be accessible at `http://localhost:5000` (or your configured port).

---

## Collection Structure

### 1. Services

Test all service-related public endpoints:

- **GET /services** - Get all active services with pagination
- **GET /services?page=1&limit=5** - Test pagination parameters
- **GET /services?category=solar** - Filter by category
- **GET /services?featured=true** - Get featured services
- **GET /services/featured** - Get featured services (dedicated endpoint)
- **GET /services/:slug** - Get service details by slug
- **GET /services/non-existent** - Test 404 error handling

### 2. Projects

Test all project-related public endpoints:

- **GET /projects** - Get all published projects
- **GET /projects?category=commercial&status=completed** - Filter projects
- **GET /projects/featured** - Get featured/recent projects
- **GET /projects/:slug** - Get project details with related projects
- **GET /projects/non-existent** - Test 404 error handling

### 3. Staff

Test all staff member public endpoints:

- **GET /staff** - Get all active staff members
- **GET /staff?department=engineering** - Filter by department
- **GET /staff?featured=true** - Get featured staff
- **GET /staff/team-leads** - Get all team leads
- **GET /staff/:id** - Get staff member by ID
- **GET /staff/invalid-id** - Test 404 error handling

### 4. Testimonials

Test testimonial viewing and submission:

- **GET /testimonials** - Get all approved testimonials
- **GET /testimonials?rating=5** - Filter by rating
- **GET /testimonials?featured=true** - Get featured testimonials
- **GET /testimonials/featured** - Get featured testimonials (dedicated endpoint)
- **POST /testimonials/submit** - Submit a testimonial (success case)
- **POST /testimonials/submit** - Submit with project reference
- **POST /testimonials/submit** - Submit with service reference
- **POST /testimonials/submit** - Test validation (missing fields)

### 5. Landing Slides

Test landing page slides:

- **GET /slides** - Get all active slides
- **GET /slides?device=desktop** - Get desktop slides
- **GET /slides?device=mobile** - Get mobile slides

### 6. Statistics

Test platform statistics:

- **GET /statistics** - Get comprehensive platform statistics

### 7. Contact Form

Test contact form submission with various scenarios:

- **POST /contact** - Submit with required fields only
- **POST /contact** - Submit with all fields
- **POST /contact** - Missing name (validation test)
- **POST /contact** - Missing email (validation test)
- **POST /contact** - Missing message (validation test)
- **POST /contact** - Empty body (validation test)

---

## Running Tests

### Option 1: Run Individual Requests

1. Open the collection in Postman
2. Navigate to any folder (e.g., Services)
3. Click on a specific request
4. Click **Send**
5. View the response and test results in the **Test Results** tab

### Option 2: Run Entire Folder

1. Click on a folder name (e.g., "Services")
2. Click **Run** button
3. Configure run settings (optional)
4. Click **Run [Folder Name]**
5. View test results summary

### Option 3: Run Entire Collection

1. Click on the collection name "Public Routes API - Complete Test Suite"
2. Click **Run** button
3. Configure run settings:
   - Select all requests or specific ones
   - Set delay between requests (e.g., 100ms)
   - Choose environment
4. Click **Run Public Routes API**
5. View comprehensive test results

### Option 4: Run via Newman (CLI)

Install Newman globally:

```bash
npm install -g newman
```

Run the collection:

```bash
# Basic run
newman run postman/Public-Routes-API.postman_collection.json

# With environment
newman run postman/Public-Routes-API.postman_collection.json \
  -e postman/Energy-Solutions-Development.postman_environment.json

# With HTML report
newman run postman/Public-Routes-API.postman_collection.json \
  -e postman/Energy-Solutions-Development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

---

## Test Coverage

### Automated Tests Included

Each request includes automated tests that verify:

#### Status Code Tests
- Successful requests return `200` or `201`
- Not found errors return `404`
- Validation errors return `400`

#### Response Structure Tests
- Response has `success` property
- Response has expected data properties
- Arrays are properly formatted
- Pagination includes page, limit, and total

#### Data Validation Tests
- Services have required fields
- Projects include related projects
- Staff members exclude sensitive data
- Testimonials include rating statistics
- Statistics have correct structure

#### Business Logic Tests
- Featured endpoints return max 6 items
- Pagination parameters work correctly
- Filters apply correctly
- View counts increment (for services/projects)

---

## Environment Variables

### Required Variables

```json
{
  "baseUrl": "http://localhost:5000",
  "apiVersion": "v1"
}
```

### Optional Variables

You can add these for easier testing:

```json
{
  "testServiceSlug": "solar-panel-installation",
  "testProjectSlug": "commercial-solar-farm",
  "testStaffId": "507f1f77bcf86cd799439011"
}
```

Then use them in requests like:
- `{{baseUrl}}/api/{{apiVersion}}/public/services/{{testServiceSlug}}`

---

## Testing Best Practices

### 1. Test Order

For best results, run tests in this order:

1. **Statistics** - Get baseline data
2. **Services** - Test service endpoints
3. **Projects** - Test project endpoints
4. **Staff** - Test staff endpoints
5. **Testimonials** (GET first) - View testimonials
6. **Landing Slides** - Test slides
7. **Testimonials** (POST) - Submit new testimonials
8. **Contact Form** - Test form submissions

### 2. Data Preparation

Before running tests, ensure your database has:

- At least a few active services
- At least a few published projects
- At least a few published staff members
- Some approved testimonials (optional)
- Some active landing slides (optional)

You can use the admin endpoints or seeding scripts to populate data.

### 3. Validation Tests

The collection includes negative test cases for:

- Non-existent resources (404 tests)
- Missing required fields (400 tests)
- Invalid data formats

These tests ensure proper error handling.

### 4. Monitoring Performance

Watch the response times in Postman:

- Most GET requests should respond < 500ms
- POST requests should respond < 1000ms
- If responses are slow, check database indexes

---

## Expected Results

### Successful Responses

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": {
    // Response data here
  },
  "pagination": {  // Only for paginated endpoints
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "metadata": {  // Optional additional data
    "averageRating": 4.5,
    "totalReviews": 100
  }
}
```

### Error Responses

Error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Problem:** Cannot connect to `http://localhost:5000`

**Solution:**
- Ensure the server is running (`npm run dev`)
- Check if the port is correct in your environment
- Verify MongoDB is running and connected

#### 2. 404 Errors for Slug/ID Tests

**Problem:** Getting 404 when testing specific slugs or IDs

**Solution:**
- Update the slug/ID in the request to match actual data in your database
- Use the "Get All" endpoints first to find valid slugs/IDs
- Create test data using admin endpoints

#### 3. Empty Arrays in Responses

**Problem:** Getting empty arrays for services, projects, etc.

**Solution:**
- Your database might be empty
- Run the seed scripts: `npm run seed`
- Or create data via admin endpoints

#### 4. Validation Errors

**Problem:** Unexpected 400 errors

**Solution:**
- Check request body format
- Ensure all required fields are present
- Verify data types match expectations

---

## Next Steps

After testing public routes:

1. **Test Admin Routes** - Use the main collection for authenticated endpoints
2. **Test Sales Admin** - Use Sales-Admin-API.postman_collection.json
3. **Load Testing** - Use Newman with high iteration counts
4. **Integration Testing** - Test full user flows across multiple endpoints

---

## Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [Newman Documentation](https://www.npmjs.com/package/newman)
- [API Documentation](../README.md)
- [Main API Collection](./Energy-Solutions-API.postman_collection.json)

---

## Support

For issues or questions:

1. Check the main README.md
2. Review API route definitions in `src/modules/public/routes/public.routes.ts`
3. Check error logs in the server console
4. Review test scripts in the collection

---

**Last Updated:** 2025-11-03
**Collection Version:** 1.0.0
**Total Test Requests:** 36
