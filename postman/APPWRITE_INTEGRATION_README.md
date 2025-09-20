# Appwrite Integration - Postman Collection Guide

## Overview

The Energy Solutions API Postman collection has been updated to demonstrate comprehensive Appwrite cloud storage integration for all image uploads across the platform. This integration ensures that all images (whether uploaded as files or provided as external URLs) are stored consistently in Appwrite storage.

## Key Features

### 🔄 Automatic URL Processing

- **External URLs**: When you provide an external image URL, the API automatically downloads the image and uploads it to Appwrite storage
- **File Uploads**: Direct file uploads are processed and stored in Appwrite with organized folder structure
- **Consistent URLs**: All images return Appwrite URLs with proper query parameters for optimal delivery

### 📁 Organized Storage Structure

- `services/` - Service-related images
- `projects/` - Project featured images and galleries
- `staff/` - Staff profile and cover images
- `landing-slides/` - Homepage slider images
- `testimonials/` - Testimonial author images and media

## Updated Endpoints

### Services Management

- **Create Service** - JSON with external URLs that are automatically stored in Appwrite
- **Create Service with File Upload** - Form-data with direct file uploads
- **Update Service** - Both JSON and form-data variants for updates
- **Update Service with File Upload** - File replacement functionality

### Projects Management

- **Create Project** - Form-data with featured image and gallery uploads
- **Create Project with URLs** - JSON with external URLs automatically processed
- **Update Project** - JSON updates with external URL processing
- **Update Project with File Upload** - File replacement for existing projects

### Staff Management

- **Create Staff** - Form-data with profile and cover image uploads
- **Create Staff with URL** - JSON with external image URLs
- **Update Staff** - JSON updates with automatic URL processing
- **Update Staff with File Upload** - Profile image updates via file upload

### Landing Slides Management

- **Create Slide** - Form-data with slide image upload
- **Create Slide with URL** - JSON with external image URL
- **Update Slide** - JSON updates with URL processing
- **Update Slide with File Upload** - Direct file replacement

### Testimonials Management

- **Create Testimonial** - JSON with author image URLs
- **Create Testimonial with File Upload** - Form-data with author image and media uploads
- **Update Testimonial** - JSON updates with URL processing
- **Update Testimonial with File Upload** - File replacement functionality

## Environment Variables

### Development Environment

```json
{
  "appwriteEndpoint": "https://cloud.appwrite.io/v1",
  "appwriteProjectId": "YOUR_DEV_PROJECT_ID",
  "appwriteBucketId": "YOUR_DEV_BUCKET_ID",
  "appwriteApiKey": "YOUR_DEV_API_KEY",
  "sampleImageUrl": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d",
  "sampleProfileUrl": "https://images.unsplash.com/photo-1494790108755-2616b612b5bc",
  "sampleGalleryUrl1": "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d",
  "sampleGalleryUrl2": "https://images.unsplash.com/photo-1466611653911-95081537e5b7"
}
```

### Production Environment

```json
{
  "appwriteEndpoint": "https://cloud.appwrite.io/v1",
  "appwriteProjectId": "PRODUCTION_PROJECT_ID",
  "appwriteBucketId": "PRODUCTION_BUCKET_ID",
  "appwriteApiKey": "PRODUCTION_API_KEY"
}
```

## Setup Instructions

### 1. Configure Appwrite Project

1. Create an Appwrite project at [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Create a storage bucket for images
3. Generate an API key with storage permissions
4. Update environment variables with your project details

### 2. Update Environment Variables

1. Open the appropriate Postman environment (Development/Production)
2. Update the Appwrite-related variables with your actual values:
   - `appwriteProjectId`
   - `appwriteBucketId`
   - `appwriteApiKey`

### 3. Test Image Upload Functionality

1. Use the "Create Service with File Upload" request to test direct file uploads
2. Use the "Create Service" request with external URLs to test URL processing
3. Verify that images are stored in your Appwrite bucket with proper organization

## Example Requests

### Creating a Service with External Images

```json
{
  "name": "Solar Panel Installation",
  "shortDescription": "Professional solar installation service",
  "image": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d",
  "gallery": [
    "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d",
    "https://images.unsplash.com/photo-1466611653911-95081537e5b7"
  ],
  "category": "solar",
  "status": "active"
}
```

### Creating a Project with File Upload

Use form-data with these fields:

- `title`: "Residential Solar Installation"
- `featuredImage`: [Select file]
- `galleryImages`: [Select multiple files]
- `client`: "ABC Company"
- `description`: "Complete solar installation project"

### Creating Staff with Mixed Content

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Technician",
  "profileImage": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
  "bio": "Experienced solar technician with 5+ years experience",
  "department": "technical"
}
```

## Image Processing Features

### Automatic Download and Storage

- External URLs are validated and downloaded
- Images are uploaded to Appwrite with organized naming conventions
- Original external URLs are replaced with Appwrite URLs
- Proper error handling for failed downloads

### File Type Support

- **Supported formats**: JPG, JPEG, PNG, WEBP, GIF
- **Size limits**: Up to 10MB per file
- **Quality optimization**: Maintains quality while optimizing for web delivery

### URL Generation

All Appwrite URLs include proper query parameters:

- `project`: Project ID for proper routing
- `mode`: Delivery mode for optimization

Example: `https://cloud.appwrite.io/v1/storage/buckets/bucket-id/files/file-id/view?project=project-id&mode=admin`

## Error Handling

The API includes comprehensive error handling:

### Image Processing Errors

- **Invalid URL**: Returns error if external URL is not accessible
- **Unsupported format**: Validates file types before processing
- **Size exceeded**: Checks file size limits
- **Network issues**: Handles download failures gracefully

### Fallback Behavior

- If external URL processing fails, continues with original URL
- Logs errors for debugging while maintaining functionality
- Provides clear error messages for troubleshooting

## Testing Checklist

- [ ] Environment variables are properly configured
- [ ] Appwrite project and bucket are created and accessible
- [ ] API key has proper storage permissions
- [ ] File upload requests work with various image formats
- [ ] External URL processing works with different image sources
- [ ] Images are properly organized in bucket folders
- [ ] Update operations correctly replace existing images
- [ ] Error handling works for invalid URLs and files

## Troubleshooting

### Common Issues

1. **"Project not found" error**

   - Verify `appwriteProjectId` in environment variables
   - Ensure project exists and is accessible

2. **"Bucket not found" error**

   - Check `appwriteBucketId` configuration
   - Verify bucket exists in your Appwrite project

3. **Authentication failures**

   - Validate `appwriteApiKey` has storage permissions
   - Ensure API key is not expired

4. **File upload failures**

   - Check file size (max 10MB)
   - Verify file format is supported
   - Ensure sufficient storage quota in Appwrite

5. **External URL processing fails**
   - Verify URL is accessible and returns valid image
   - Check for CORS restrictions on external domains
   - Ensure stable internet connection for downloads

### Debug Mode

Enable debug logging by checking server logs for detailed error information during image processing operations.

## Security Considerations

- **API Keys**: Keep Appwrite API keys secure and use different keys for development/production
- **File Validation**: All uploads are validated for type and size
- **URL Validation**: External URLs are validated before processing
- **Access Control**: Implement proper authentication for admin endpoints

## Performance Notes

- **Async Processing**: Image downloads and uploads are handled asynchronously
- **Concurrent Uploads**: Multiple images in galleries are processed in parallel
- **Caching**: Appwrite provides built-in CDN and caching for optimal delivery
- **Optimization**: Images maintain quality while being optimized for web delivery

---

For additional support or questions about the Appwrite integration, refer to the main API documentation or contact the development team.
