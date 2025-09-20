import { AppError } from "@shared/errors/AppError";
import { appwriteService } from "@shared/services/appwrite.service";
import { asyncHandler } from "@shared/utils/async-handler.util";
import { ResponseUtil } from "@shared/utils/response.util";
import { Request, Response } from "express";
import mongoose from "mongoose";
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
