import { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../../../shared/errors/AppError";
import { appwriteService } from "../../../../shared/services/appwrite.service";
import { asyncHandler } from "../../../../shared/utils/async-handler.util";
import { ResponseUtil } from "../../../../shared/utils/response.util";
import { WebAdminService } from "../service/web-admin.service";

export class WebAdminController {
  private webAdminService: WebAdminService;

  constructor() {
    this.webAdminService = new WebAdminService();
  }

  // =============== SERVICES ENDPOINTS ===============

  createService = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const service = await this.webAdminService.createService(
        adminId as mongoose.Types.ObjectId,
        req.body
      );

      ResponseUtil.created(res, { service }, "Service created successfully");
    }
  );

  updateService = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { serviceId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const service = await this.webAdminService.updateService(
        adminId as mongoose.Types.ObjectId,
        serviceId,
        req.body
      );

      ResponseUtil.success(res, { service }, "Service updated successfully");
    }
  );

  createServiceWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle image uploads if files are provided
      let serviceData = { ...req.body };

      // Parse JSON fields from form data
      try {
        if (serviceData.features && typeof serviceData.features === "string") {
          serviceData.features = JSON.parse(serviceData.features);
        }
        if (serviceData.pricing && typeof serviceData.pricing === "string") {
          serviceData.pricing = JSON.parse(serviceData.pricing);
        }
        if (
          serviceData.isFeatured &&
          typeof serviceData.isFeatured === "string"
        ) {
          serviceData.isFeatured =
            serviceData.isFeatured.toLowerCase() === "true";
        }
      } catch (parseError) {
        throw new AppError("Invalid JSON in form data fields", 400);
      }

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        try {
          // Upload main image
          if (files.image && files.image[0]) {
            const imageUrl = await appwriteService.uploadImage(
              files.image[0],
              "services"
            );
            serviceData.image = imageUrl;
          }

          // Upload gallery images
          if (files.galleryImages && files.galleryImages.length > 0) {
            const galleryUrls = await appwriteService.uploadMultipleImages(
              files.galleryImages,
              "services"
            );
            serviceData.gallery = galleryUrls;
          }
        } catch (error) {
          throw new AppError(
            `Failed to upload service images: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      const service = await this.webAdminService.createService(
        adminId as mongoose.Types.ObjectId,
        serviceData
      );

      ResponseUtil.created(res, { service }, "Service created successfully");
    }
  );

  updateServiceWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { serviceId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle image uploads if files are provided
      let serviceData = { ...req.body };

      // Parse JSON fields from form data
      try {
        if (serviceData.features && typeof serviceData.features === "string") {
          serviceData.features = JSON.parse(serviceData.features);
        }
        if (serviceData.pricing && typeof serviceData.pricing === "string") {
          serviceData.pricing = JSON.parse(serviceData.pricing);
        }
        if (
          serviceData.isFeatured &&
          typeof serviceData.isFeatured === "string"
        ) {
          serviceData.isFeatured =
            serviceData.isFeatured.toLowerCase() === "true";
        }
      } catch (parseError) {
        throw new AppError("Invalid JSON in form data fields", 400);
      }

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        try {
          // Upload main image
          if (files.image && files.image[0]) {
            const imageUrl = await appwriteService.uploadImage(
              files.image[0],
              "services"
            );
            serviceData.image = imageUrl;
          }

          // Upload gallery images
          if (files.galleryImages && files.galleryImages.length > 0) {
            const galleryUrls = await appwriteService.uploadMultipleImages(
              files.galleryImages,
              "services"
            );
            serviceData.gallery = galleryUrls;
          }
        } catch (error) {
          throw new AppError(
            `Failed to upload service images: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      const service = await this.webAdminService.updateService(
        adminId as mongoose.Types.ObjectId,
        serviceId,
        serviceData
      );

      ResponseUtil.success(res, { service }, "Service updated successfully");
    }
  );

  deleteService = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { serviceId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.webAdminService.deleteService(
        adminId as mongoose.Types.ObjectId,
        serviceId
      );

      ResponseUtil.success(res, null, "Service deleted successfully");
    }
  );

  getServices = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { category, status, isFeatured, page, limit, sortBy, sortOrder } =
        req.query;

      const result = await this.webAdminService.getServices(
        {
          category,
          status,
          isFeatured:
            isFeatured === "true"
              ? true
              : isFeatured === "false"
              ? false
              : undefined,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.services,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Services retrieved successfully"
      );
    }
  );

  getServiceById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { serviceId } = req.params;

      const { Service } = await import("../models/service.model");
      const service = await Service.findById(serviceId)
        .populate("createdBy", "firstName lastName email")
        .populate("lastModifiedBy", "firstName lastName email");

      if (!service) {
        throw AppError.notFound("Service not found");
      }

      // Increment views for public access
      if (!req.user || req.user.role === "customer") {
        await service.incrementViews();
      }

      ResponseUtil.success(res, { service }, "Service retrieved successfully");
    }
  );

  // =============== PROJECTS ENDPOINTS ===============

  createProject = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle image uploads if files are provided
      let projectData = { ...req.body };

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        try {
          // Upload featured image
          if (files.featuredImage && files.featuredImage[0]) {
            const featuredImageUrl = await appwriteService.uploadImage(
              files.featuredImage[0],
              "projects"
            );
            projectData.images = {
              ...projectData.images,
              featured: featuredImageUrl,
            };
          }

          // Upload gallery images
          if (files.galleryImages && files.galleryImages.length > 0) {
            const galleryUrls = await appwriteService.uploadMultipleImages(
              files.galleryImages,
              "projects/gallery"
            );
            projectData.images = {
              ...projectData.images,
              gallery: galleryUrls,
            };
          }

          // Upload before/after images
          if (files.beforeImages && files.afterImages) {
            const beforeUrls = await appwriteService.uploadMultipleImages(
              files.beforeImages,
              "projects/before"
            );
            const afterUrls = await appwriteService.uploadMultipleImages(
              files.afterImages,
              "projects/after"
            );

            // Pair before and after images
            const beforeAfter = beforeUrls.map((before, index) => ({
              before,
              after: afterUrls[index] || "",
            }));

            projectData.images = {
              ...projectData.images,
              beforeAfter,
            };
          }
        } catch (error) {
          throw new AppError(
            `Failed to upload project images: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      const project = await this.webAdminService.createProject(
        adminId as mongoose.Types.ObjectId,
        projectData
      );

      ResponseUtil.created(res, { project }, "Project created successfully");
    }
  );

  createProjectWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle image uploads if files are provided
      let projectData = { ...req.body };

      // Parse JSON fields from form data
      try {
        if (req.body.location && typeof req.body.location === "string") {
          projectData.location = JSON.parse(req.body.location);
        }
        if (
          req.body.technologies &&
          typeof req.body.technologies === "string"
        ) {
          projectData.technologies = JSON.parse(req.body.technologies);
        }
        if (
          req.body.projectValue &&
          typeof req.body.projectValue === "string"
        ) {
          projectData.projectValue = JSON.parse(req.body.projectValue);
        }
        if (req.body.outcomes && typeof req.body.outcomes === "string") {
          projectData.outcomes = JSON.parse(req.body.outcomes);
        }
        if (req.body.tags && typeof req.body.tags === "string") {
          projectData.tags = JSON.parse(req.body.tags);
        }
        if (req.body.testimonial && typeof req.body.testimonial === "string") {
          projectData.testimonial = JSON.parse(req.body.testimonial);
        }
        if (
          req.body.relatedServices &&
          typeof req.body.relatedServices === "string"
        ) {
          projectData.relatedServices = JSON.parse(req.body.relatedServices);
        }
      } catch (parseError) {
        throw AppError.badRequest("Invalid JSON in form data fields");
      }

      // Parse boolean and number fields
      if (typeof req.body.isFeatured === "string") {
        projectData.isFeatured = req.body.isFeatured === "true";
      }
      if (typeof req.body.isPublished === "string") {
        projectData.isPublished = req.body.isPublished === "true";
      }
      if (typeof req.body.displayOrder === "string") {
        projectData.displayOrder = parseInt(req.body.displayOrder);
      }
      if (typeof req.body.teamSize === "string") {
        projectData.teamSize = parseInt(req.body.teamSize);
      }

      // Parse date fields
      if (req.body.startDate && typeof req.body.startDate === "string") {
        projectData.startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate && typeof req.body.endDate === "string") {
        projectData.endDate = new Date(req.body.endDate);
      }

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        // Handle featured image
        if (files.featuredImage && files.featuredImage[0]) {
          try {
            const featuredImageUrl = await appwriteService.uploadImage(
              files.featuredImage[0],
              "projects"
            );
            projectData.images = projectData.images || {};
            projectData.images.featured = featuredImageUrl;
          } catch (error) {
            throw new AppError(
              `Failed to upload featured image: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }

        // Handle gallery images
        if (files.galleryImages && files.galleryImages.length > 0) {
          try {
            const galleryUrls = await Promise.all(
              files.galleryImages.map((file) =>
                appwriteService.uploadImage(file, "projects")
              )
            );
            projectData.images = projectData.images || {};
            projectData.images.gallery = galleryUrls;
          } catch (error) {
            throw new AppError(
              `Failed to upload gallery images: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }
      }

      // Manual validation after parsing JSON fields
      const { createProjectSchema } = await import(
        "../validator/web-admin.validator"
      );
      const { error, value } = createProjectSchema.validate(projectData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        console.log("Project validation errors:", errors);
        console.log(
          "Project data being validated:",
          JSON.stringify(projectData, null, 2)
        );

        throw AppError.validationError("Validation failed", errors);
      }

      const project = await this.webAdminService.createProject(
        adminId as mongoose.Types.ObjectId,
        value
      );

      ResponseUtil.created(res, { project }, "Project created successfully");
    }
  );

  updateProject = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { projectId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const project = await this.webAdminService.updateProject(
        adminId as mongoose.Types.ObjectId,
        projectId,
        req.body
      );

      ResponseUtil.success(res, { project }, "Project updated successfully");
    }
  );

  updateProjectWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { projectId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Parse form data fields manually
      let projectData = { ...req.body };

      // Parse JSON fields from form data
      try {
        if (req.body.location && typeof req.body.location === "string") {
          projectData.location = JSON.parse(req.body.location);
        }
        if (
          req.body.technologies &&
          typeof req.body.technologies === "string"
        ) {
          projectData.technologies = JSON.parse(req.body.technologies);
        }
        if (
          req.body.projectValue &&
          typeof req.body.projectValue === "string"
        ) {
          projectData.projectValue = JSON.parse(req.body.projectValue);
        }
        if (req.body.outcomes && typeof req.body.outcomes === "string") {
          projectData.outcomes = JSON.parse(req.body.outcomes);
        }
        if (req.body.testimonial && typeof req.body.testimonial === "string") {
          projectData.testimonial = JSON.parse(req.body.testimonial);
        }
        if (req.body.tags && typeof req.body.tags === "string") {
          projectData.tags = JSON.parse(req.body.tags);
        }
        if (
          req.body.relatedServices &&
          typeof req.body.relatedServices === "string"
        ) {
          projectData.relatedServices = JSON.parse(req.body.relatedServices);
        }
      } catch (parseError) {
        throw AppError.badRequest("Invalid JSON in form data fields");
      }

      // Parse boolean and number fields
      if (typeof req.body.isFeatured === "string") {
        projectData.isFeatured = req.body.isFeatured === "true";
      }
      if (typeof req.body.isPublished === "string") {
        projectData.isPublished = req.body.isPublished === "true";
      }
      if (typeof req.body.displayOrder === "string") {
        projectData.displayOrder = parseInt(req.body.displayOrder);
      }
      if (typeof req.body.teamSize === "string") {
        projectData.teamSize = parseInt(req.body.teamSize);
      }

      // Parse date fields
      if (req.body.startDate && typeof req.body.startDate === "string") {
        projectData.startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate && typeof req.body.endDate === "string") {
        projectData.endDate = new Date(req.body.endDate);
      }

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        // Handle featured image upload
        if (files.featuredImage && files.featuredImage[0]) {
          try {
            const featuredImageUrl = await appwriteService.uploadImage(
              files.featuredImage[0],
              "projects"
            );
            projectData.images = projectData.images || {};
            projectData.images.featured = featuredImageUrl;
          } catch (error) {
            throw new AppError(
              `Failed to upload featured image: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }

        // Handle gallery images upload
        if (files.galleryImages) {
          try {
            const galleryUrls = await Promise.all(
              files.galleryImages.map((file) =>
                appwriteService.uploadImage(file, "projects")
              )
            );
            projectData.images = projectData.images || {};
            projectData.images.gallery = galleryUrls;
          } catch (error) {
            throw new AppError(
              `Failed to upload gallery images: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }
      }

      // Clean up empty strings for optional fields
      if (projectData.clientLogo === "") {
        delete projectData.clientLogo;
      }
      if (projectData.challenges === "") {
        delete projectData.challenges;
      }
      if (projectData.solutions === "") {
        delete projectData.solutions;
      }

      // Manual validation after parsing JSON fields
      const { updateProjectSchema } = await import(
        "../validator/web-admin.validator"
      );
      const { error, value } = updateProjectSchema.validate(projectData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        console.log("Project update validation errors:", errors);
        console.log(
          "Project data being validated:",
          JSON.stringify(projectData, null, 2)
        );

        throw AppError.validationError("Validation failed", errors);
      }

      const project = await this.webAdminService.updateProject(
        adminId as mongoose.Types.ObjectId,
        projectId,
        value
      );

      ResponseUtil.success(res, { project }, "Project updated successfully");
    }
  );

  deleteProject = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { projectId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.webAdminService.deleteProject(
        adminId as mongoose.Types.ObjectId,
        projectId
      );

      ResponseUtil.success(res, null, "Project deleted successfully");
    }
  );

  getProjects = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        category,
        status,
        isPublished,
        isFeatured,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await this.webAdminService.getProjects(
        {
          category,
          status,
          isPublished:
            isPublished === "true"
              ? true
              : isPublished === "false"
              ? false
              : undefined,
          isFeatured:
            isFeatured === "true"
              ? true
              : isFeatured === "false"
              ? false
              : undefined,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.projects,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Projects retrieved successfully"
      );
    }
  );

  getProjectById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { projectId } = req.params;

      const { Project } = await import("../models/project.model");
      const project = await Project.findById(projectId)
        .populate("createdBy", "firstName lastName email")
        .populate("lastModifiedBy", "firstName lastName email")
        .populate("relatedServices", "name slug");

      if (!project) {
        throw AppError.notFound("Project not found");
      }

      // Increment views for public access
      if (!req.user || req.user.role === "customer") {
        await project.incrementViews();
      }

      ResponseUtil.success(res, { project }, "Project retrieved successfully");
    }
  );

  publishProject = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { projectId } = req.params;

      const { Project } = await import("../models/project.model");
      const project = await Project.findById(projectId);

      if (!project) {
        throw AppError.notFound("Project not found");
      }

      await project.publish();

      ResponseUtil.success(res, { project }, "Project published successfully");
    }
  );

  // =============== STAFF ENDPOINTS ===============

  createStaff = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle profile image upload if file is provided
      let staffData = { ...req.body };

      if (req.file) {
        try {
          const profileImageUrl = await appwriteService.uploadImage(
            req.file,
            "staff"
          );
          staffData.profileImage = profileImageUrl;
        } catch (error) {
          throw new AppError(
            `Failed to upload staff profile image: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      const staff = await this.webAdminService.createStaff(
        adminId as mongoose.Types.ObjectId,
        staffData
      );

      ResponseUtil.created(res, { staff }, "Staff member created successfully");
    }
  );

  createStaffWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Parse form data fields manually to avoid parseFormDataJSON middleware issues
      let staffData = { ...req.body };

      // Parse JSON fields if they exist
      if (
        req.body.qualifications &&
        typeof req.body.qualifications === "string"
      ) {
        try {
          staffData.qualifications = JSON.parse(req.body.qualifications);
        } catch (error) {
          throw AppError.badRequest("Invalid qualifications format");
        }
      }

      if (req.body.socialLinks && typeof req.body.socialLinks === "string") {
        try {
          staffData.socialLinks = JSON.parse(req.body.socialLinks);
        } catch (error) {
          throw AppError.badRequest("Invalid socialLinks format");
        }
      }

      if (req.body.skills && typeof req.body.skills === "string") {
        try {
          staffData.skills = JSON.parse(req.body.skills);
        } catch (error) {
          throw AppError.badRequest("Invalid skills format");
        }
      }

      if (req.body.achievements && typeof req.body.achievements === "string") {
        try {
          staffData.achievements = JSON.parse(req.body.achievements);
        } catch (error) {
          throw AppError.badRequest("Invalid achievements format");
        }
      }

      if (
        req.body.specializations &&
        typeof req.body.specializations === "string"
      ) {
        try {
          staffData.specializations = JSON.parse(req.body.specializations);
        } catch (error) {
          throw AppError.badRequest("Invalid specializations format");
        }
      }

      if (req.body.languages && typeof req.body.languages === "string") {
        try {
          staffData.languages = JSON.parse(req.body.languages);
        } catch (error) {
          throw AppError.badRequest("Invalid languages format");
        }
      }

      // Parse boolean fields from form data strings
      if (typeof req.body.isTeamLead === "string") {
        staffData.isTeamLead = req.body.isTeamLead === "true";
      }

      if (typeof req.body.isFeatured === "string") {
        staffData.isFeatured = req.body.isFeatured === "true";
      }

      if (typeof req.body.isPublished === "string") {
        staffData.isPublished = req.body.isPublished === "true";
      }

      // Parse number fields from form data strings
      if (typeof req.body.yearsOfExperience === "string") {
        staffData.yearsOfExperience = parseInt(req.body.yearsOfExperience);
      }

      if (typeof req.body.displayOrder === "string") {
        staffData.displayOrder = parseInt(req.body.displayOrder);
      }

      // Parse date fields
      if (req.body.joinedDate && typeof req.body.joinedDate === "string") {
        staffData.joinedDate = new Date(req.body.joinedDate);
      }

      // Clean up empty strings to undefined for optional fields
      if (staffData.coverImage === "") {
        delete staffData.coverImage;
      }
      if (staffData.phone === "") {
        delete staffData.phone;
      }

      // Handle profile image upload
      if (req.file) {
        try {
          const profileImageUrl = await appwriteService.uploadImage(
            req.file,
            "staff"
          );
          staffData.profileImage = profileImageUrl;
        } catch (error) {
          throw new AppError(
            `Failed to upload staff profile image: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      // Manual validation after parsing JSON fields
      const { createStaffSchema } = await import(
        "../validator/web-admin.validator"
      );
      const { error, value } = createStaffSchema.validate(staffData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        // Log the validation errors for debugging
        console.log("Staff validation errors:", errors);
        console.log(
          "Staff data being validated:",
          JSON.stringify(staffData, null, 2)
        );

        throw AppError.validationError("Validation failed", errors);
      }

      const staff = await this.webAdminService.createStaff(
        adminId as mongoose.Types.ObjectId,
        value
      );

      ResponseUtil.created(res, { staff }, "Staff member created successfully");
    }
  );

  updateStaff = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { staffId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const staff = await this.webAdminService.updateStaff(
        adminId as mongoose.Types.ObjectId,
        staffId,
        req.body
      );

      ResponseUtil.success(res, { staff }, "Staff member updated successfully");
    }
  );

  updateStaffWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { staffId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Parse form data fields manually to avoid parseFormDataJSON middleware issues
      let staffData = { ...req.body };

      // Parse JSON fields if they exist
      if (
        req.body.qualifications &&
        typeof req.body.qualifications === "string"
      ) {
        try {
          staffData.qualifications = JSON.parse(req.body.qualifications);
        } catch (error) {
          throw AppError.badRequest("Invalid qualifications format");
        }
      }

      if (req.body.socialLinks && typeof req.body.socialLinks === "string") {
        try {
          staffData.socialLinks = JSON.parse(req.body.socialLinks);
        } catch (error) {
          throw AppError.badRequest("Invalid socialLinks format");
        }
      }

      if (req.body.skills && typeof req.body.skills === "string") {
        try {
          staffData.skills = JSON.parse(req.body.skills);
        } catch (error) {
          throw AppError.badRequest("Invalid skills format");
        }
      }

      if (req.body.achievements && typeof req.body.achievements === "string") {
        try {
          staffData.achievements = JSON.parse(req.body.achievements);
        } catch (error) {
          throw AppError.badRequest("Invalid achievements format");
        }
      }

      if (
        req.body.specializations &&
        typeof req.body.specializations === "string"
      ) {
        try {
          staffData.specializations = JSON.parse(req.body.specializations);
        } catch (error) {
          throw AppError.badRequest("Invalid specializations format");
        }
      }

      if (req.body.languages && typeof req.body.languages === "string") {
        try {
          staffData.languages = JSON.parse(req.body.languages);
        } catch (error) {
          throw AppError.badRequest("Invalid languages format");
        }
      }

      // Parse boolean fields from form data strings
      if (typeof req.body.isTeamLead === "string") {
        staffData.isTeamLead = req.body.isTeamLead === "true";
      }

      if (typeof req.body.isFeatured === "string") {
        staffData.isFeatured = req.body.isFeatured === "true";
      }

      if (typeof req.body.isPublished === "string") {
        staffData.isPublished = req.body.isPublished === "true";
      }

      // Parse number fields from form data strings
      if (typeof req.body.yearsOfExperience === "string") {
        staffData.yearsOfExperience = parseInt(req.body.yearsOfExperience);
      }

      if (typeof req.body.displayOrder === "string") {
        staffData.displayOrder = parseInt(req.body.displayOrder);
      }

      // Parse date fields
      if (req.body.joinedDate && typeof req.body.joinedDate === "string") {
        staffData.joinedDate = new Date(req.body.joinedDate);
      }

      // Clean up empty strings to undefined for optional fields
      if (staffData.coverImage === "") {
        delete staffData.coverImage;
      }
      if (staffData.phone === "") {
        delete staffData.phone;
      }

      // Handle profile image upload if new file is provided
      if (req.file) {
        try {
          const profileImageUrl = await appwriteService.uploadImage(
            req.file,
            "staff"
          );
          staffData.profileImage = profileImageUrl;
        } catch (error) {
          throw new AppError(
            `Failed to upload staff profile image: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      }

      // Manual validation after parsing JSON fields
      const { updateStaffSchema } = await import(
        "../validator/web-admin.validator"
      );
      const { error, value } = updateStaffSchema.validate(staffData, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        // Log the validation errors for debugging
        console.log("Staff update validation errors:", errors);
        console.log(
          "Staff update data being validated:",
          JSON.stringify(staffData, null, 2)
        );

        throw AppError.validationError("Validation failed", errors);
      }

      const staff = await this.webAdminService.updateStaff(
        adminId as mongoose.Types.ObjectId,
        staffId,
        value
      );

      ResponseUtil.success(res, { staff }, "Staff member updated successfully");
    }
  );

  deleteStaff = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { staffId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.webAdminService.deleteStaff(
        adminId as mongoose.Types.ObjectId,
        staffId
      );

      ResponseUtil.success(res, null, "Staff member deleted successfully");
    }
  );

  getStaff = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        department,
        status,
        isTeamLead,
        isFeatured,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await this.webAdminService.getStaff(
        {
          department,
          status,
          isTeamLead:
            isTeamLead === "true"
              ? true
              : isTeamLead === "false"
              ? false
              : undefined,
          isFeatured:
            isFeatured === "true"
              ? true
              : isFeatured === "false"
              ? false
              : undefined,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.staff,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Staff members retrieved successfully"
      );
    }
  );

  getStaffById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { staffId } = req.params;

      const { Staff } = await import("../models/staff.model");
      const staff = await Staff.findById(staffId)
        .populate("userId", "email")
        .populate("createdBy", "firstName lastName email")
        .populate("lastModifiedBy", "firstName lastName email");

      if (!staff) {
        throw AppError.notFound("Staff member not found");
      }

      ResponseUtil.success(
        res,
        { staff },
        "Staff member retrieved successfully"
      );
    }
  );

  // =============== TESTIMONIALS ENDPOINTS ===============

  createTestimonial = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const testimonial = await this.webAdminService.createTestimonial(
        adminId as mongoose.Types.ObjectId,
        req.body
      );

      ResponseUtil.created(
        res,
        { testimonial },
        "Testimonial created successfully"
      );
    }
  );

  createTestimonialWithFileUpload = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Parse form data fields manually
      let testimonialData = { ...req.body };

      // Parse JSON fields from form data
      try {
        if (req.body.author && typeof req.body.author === "string") {
          testimonialData.author = JSON.parse(req.body.author);
        }
        if (req.body.tags && typeof req.body.tags === "string") {
          testimonialData.tags = JSON.parse(req.body.tags);
        }
        if (req.body.socialProof && typeof req.body.socialProof === "string") {
          testimonialData.socialProof = JSON.parse(req.body.socialProof);
        }
      } catch (parseError) {
        throw AppError.badRequest("Invalid JSON in form data fields");
      }

      // Parse boolean and number fields
      if (typeof req.body.isFeatured === "string") {
        testimonialData.isFeatured = req.body.isFeatured === "true";
      }
      if (typeof req.body.isPublished === "string") {
        testimonialData.isPublished = req.body.isPublished === "true";
      }
      if (typeof req.body.rating === "string") {
        testimonialData.rating = parseInt(req.body.rating);
      }
      if (typeof req.body.displayOrder === "string") {
        testimonialData.displayOrder = parseInt(req.body.displayOrder);
      }

      // Type assertion for multer files
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      if (files) {
        // Handle author image upload
        if (files.authorImage && files.authorImage[0]) {
          try {
            const authorImageUrl = await appwriteService.uploadImage(
              files.authorImage[0],
              "testimonials"
            );
            testimonialData.author = testimonialData.author || {};
            testimonialData.author.image = authorImageUrl;
          } catch (error) {
            throw new AppError(
              `Failed to upload author image: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }

        // Handle media file upload
        if (files.mediaUrl && files.mediaUrl[0]) {
          try {
            const mediaUrl = await appwriteService.uploadImage(
              files.mediaUrl[0],
              "testimonials"
            );
            testimonialData.mediaUrl = mediaUrl;
          } catch (error) {
            throw new AppError(
              `Failed to upload media file: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              500
            );
          }
        }
      }

      // Clean up empty strings to undefined for optional fields
      if (testimonialData.mediaUrl === "") {
        delete testimonialData.mediaUrl;
      }
      if (testimonialData.thumbnailUrl === "") {
        delete testimonialData.thumbnailUrl;
      }
      if (testimonialData.source === "") {
        delete testimonialData.source;
      }
      if (testimonialData.adminNotes === "") {
        delete testimonialData.adminNotes;
      }

      // Manual validation after parsing JSON fields
      const { createTestimonialSchema } = await import(
        "../validator/web-admin.validator"
      );
      const { error, value } = createTestimonialSchema.validate(
        testimonialData,
        {
          abortEarly: false,
          stripUnknown: true,
        }
      );

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        console.log("Testimonial validation errors:", errors);
        console.log(
          "Testimonial data being validated:",
          JSON.stringify(testimonialData, null, 2)
        );

        throw AppError.validationError("Validation failed", errors);
      }

      const testimonial = await this.webAdminService.createTestimonial(
        adminId as mongoose.Types.ObjectId,
        value
      );

      ResponseUtil.created(
        res,
        { testimonial },
        "Testimonial created successfully"
      );
    }
  );

  approveTestimonial = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { testimonialId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const testimonial = await this.webAdminService.approveTestimonial(
        adminId as mongoose.Types.ObjectId,
        testimonialId
      );

      ResponseUtil.success(
        res,
        { testimonial },
        "Testimonial approved successfully"
      );
    }
  );

  rejectTestimonial = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { testimonialId } = req.params;
      const { reason } = req.body;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      if (!reason) {
        throw AppError.badRequest("Rejection reason is required");
      }

      const testimonial = await this.webAdminService.rejectTestimonial(
        adminId as mongoose.Types.ObjectId,
        testimonialId,
        reason
      );

      ResponseUtil.success(res, { testimonial }, "Testimonial rejected");
    }
  );

  getTestimonials = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        status,
        rating,
        isFeatured,
        isPublished,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await this.webAdminService.getTestimonials(
        {
          status,
          rating: rating ? parseInt(rating as string) : undefined,
          isFeatured:
            isFeatured === "true"
              ? true
              : isFeatured === "false"
              ? false
              : undefined,
          isPublished:
            isPublished === "true"
              ? true
              : isPublished === "false"
              ? false
              : undefined,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.testimonials,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Testimonials retrieved successfully"
      );
    }
  );

  // =============== LANDING SLIDES ENDPOINTS ===============

  createSlide = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      // Handle slide image upload if file is provided
      let slideData = { ...req.body };

      if (req.file) {
        try {
          const imageUrl = await appwriteService.uploadImage(
            req.file,
            "landing-slides"
          );
          // Ensure media object exists and add the imageUrl
          slideData.media = {
            alt: slideData.media?.alt || "Landing slide image",
            imageUrl,
          };
        } catch (error) {
          throw new AppError(
            `Failed to upload slide image: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            500
          );
        }
      } else {
        // If no file uploaded but media object exists, ensure it has required fields
        if (!slideData.media?.imageUrl) {
          throw new AppError(
            "Either upload an image file or provide an image URL in the media object",
            400
          );
        }
      }

      const slide = await this.webAdminService.createSlide(
        adminId as mongoose.Types.ObjectId,
        slideData
      );

      ResponseUtil.created(
        res,
        { slide },
        "Landing slide created successfully"
      );
    }
  );

  updateSlide = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { slideId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      const slide = await this.webAdminService.updateSlide(
        adminId as mongoose.Types.ObjectId,
        slideId,
        req.body
      );

      ResponseUtil.success(
        res,
        { slide },
        "Landing slide updated successfully"
      );
    }
  );

  deleteSlide = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { slideId } = req.params;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      await this.webAdminService.deleteSlide(
        adminId as mongoose.Types.ObjectId,
        slideId
      );

      ResponseUtil.success(res, null, "Landing slide deleted successfully");
    }
  );

  getSlides = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { type, status, page, limit, sortBy, sortOrder } = req.query;

      const result = await this.webAdminService.getSlides(
        {
          type,
          status,
        },
        {
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
          sortBy: sortBy as string,
          sortOrder: sortOrder as "asc" | "desc",
        }
      );

      ResponseUtil.paginated(
        res,
        result.slides,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Landing slides retrieved successfully"
      );
    }
  );

  reorderSlides = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const adminId = req.user?._id;
      const { slides } = req.body;

      if (!adminId) {
        throw AppError.unauthorized("User not authenticated");
      }

      if (!Array.isArray(slides)) {
        throw AppError.badRequest("Slides array is required");
      }

      await this.webAdminService.reorderSlides(
        adminId as mongoose.Types.ObjectId,
        slides
      );

      ResponseUtil.success(res, null, "Slides reordered successfully");
    }
  );

  activateSlide = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { slideId } = req.params;

      const { LandingSlide } = await import("../models/landing-slide.model");
      const slide = await LandingSlide.findById(slideId);

      if (!slide) {
        throw AppError.notFound("Slide not found");
      }

      await slide.activate();

      ResponseUtil.success(res, { slide }, "Slide activated successfully");
    }
  );

  deactivateSlide = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { slideId } = req.params;

      const { LandingSlide } = await import("../models/landing-slide.model");
      const slide = await LandingSlide.findById(slideId);

      if (!slide) {
        throw AppError.notFound("Slide not found");
      }

      await slide.deactivate();

      ResponseUtil.success(res, { slide }, "Slide deactivated successfully");
    }
  );

  // =============== DASHBOARD ===============

  getDashboardStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await this.webAdminService.getDashboardStats();
      ResponseUtil.success(
        res,
        stats,
        "Dashboard statistics retrieved successfully"
      );
    }
  );
}
