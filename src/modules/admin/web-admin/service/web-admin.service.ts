import mongoose from "mongoose";
import { appConfig } from "../../../../config/app.config";
import { Customer } from "../../../../modules/admin/sales-admin/models/customer.model";
import {
  ActivityLog,
  ActivitySeverity,
  ActivityType,
} from "../../../../modules/admin/system-admin/models/activity-log.model";
import { AppError } from "../../../../shared/errors/AppError";
import { AppwriteService } from "../../../../shared/services/appwrite.service";
import { EmailUtil } from "../../../../shared/utils/email.util";
import { logger } from "../../../../shared/utils/logger.util";
import { ContactMessage } from "../models/contact-message.model";
import {
  CampaignStatus,
  EmailCampaign,
} from "../models/email-campaign.model";
import { ILandingSlide, LandingSlide } from "../models/landing-slide.model";
import { IProject, Project } from "../models/project.model";
import { IService, Service } from "../models/service.model";
import { IStaff, Staff } from "../models/staff.model";
import { ITestimonial, Testimonial } from "../models/testimonial.model";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ServiceDto {
  name: string;
  shortDescription: string;
  longDescription?: string;
  category: string;
  features?: any[];
  pricing?: any;
  duration?: string;
  image?: string;
  gallery?: string[];
  icon?: string;
  status?: string;
  isFeatured?: boolean;
}

export interface ProjectDto {
  title: string;
  client: string;
  description: string;
  category: string;
  startDate: Date;
  endDate?: Date;
  location: any;
  images: any;
  mainImageUrl?: string;
  galleryImages?: string[];
  status?: string;
}

export interface StaffDto {
  employeeId?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  bio: string;
  profileImage: string;
  coverImage?: string;
  qualifications?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  skills?: string[];
  yearsOfExperience?: number;
  joinedDate?: Date;
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  achievements?: string[];
  specializations?: string[];
  languages?: string[];
  isTeamLead?: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
  status?: string;
  availability?: {
    isAvailable?: boolean;
    message?: string;
  };
  statistics?: {
    projectsCompleted?: number;
    clientsServed?: number;
    rating?: number;
    totalReviews?: number;
  };
  imageUrl?: string;
}

export interface TestimonialDto {
  content: string;
  rating: number;
  author: any;
  status?: string;
}

export interface SlideDto {
  title: string;
  type: string;
  content: any;
  media: any;
  imageUrl?: string;
  status?: string;
  displayOrder?: number;
}

export class WebAdminService {
  private appwriteService: AppwriteService;

  constructor() {
    this.appwriteService = new AppwriteService();
  }
  // Helper method to handle transactions in development vs production
  private async executeWithOptionalTransaction<T>(
    operation: (session?: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    if (appConfig.isDevelopment()) {
      // Skip transactions in development
      return await operation();
    } else {
      // Use transactions in production
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const result = await operation(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }
  }

  // =============== SERVICES MANAGEMENT ===============

  async createService(
    adminId: mongoose.Types.ObjectId,
    dto: ServiceDto
  ): Promise<IService> {
    return await this.executeWithOptionalTransaction(async (session) => {
      // Process main image if provided
      if (dto.image) {
        try {
          const processedImageUrl =
            await this.appwriteService.uploadImageFromUrl(
              dto.image,
              "services",
              `service_main_${Date.now()}`
            );
          dto.image = processedImageUrl;

          logger.info("Service main image processed and uploaded to Appwrite", {
            originalUrl: dto.image,
            processedUrl: processedImageUrl,
          });
        } catch (imageError) {
          logger.error("Failed to process service main image", {
            imageUrl: dto.image,
            error:
              imageError instanceof Error
                ? imageError.message
                : "Unknown error",
          });
          // Continue with original URL if processing fails
        }
      }

      // Process gallery images if provided
      if (dto.gallery && dto.gallery.length > 0) {
        try {
          const processedGalleryUrls: string[] = [];

          for (let i = 0; i < dto.gallery.length; i++) {
            const galleryImageUrl = dto.gallery[i];
            try {
              const processedUrl =
                await this.appwriteService.uploadImageFromUrl(
                  galleryImageUrl,
                  "services",
                  `service_gallery_${Date.now()}_${i}`
                );
              processedGalleryUrls.push(processedUrl);
            } catch (galleryImageError) {
              logger.error("Failed to process gallery image", {
                imageUrl: galleryImageUrl,
                index: i,
                error:
                  galleryImageError instanceof Error
                    ? galleryImageError.message
                    : "Unknown error",
              });
              // Use original URL if processing fails
              processedGalleryUrls.push(galleryImageUrl);
            }
          }

          dto.gallery = processedGalleryUrls;

          logger.info(
            "Service gallery images processed and uploaded to Appwrite",
            {
              originalCount: dto.gallery.length,
              processedCount: processedGalleryUrls.length,
            }
          );
        } catch (galleryError) {
          logger.error("Failed to process service gallery images", {
            error:
              galleryError instanceof Error
                ? galleryError.message
                : "Unknown error",
          });
          // Continue with original URLs if processing fails
        }
      }

      const service = new Service({
        ...dto,
        createdBy: adminId,
      });

      await service.save(session ? { session } : {});

      // Log activity
      const activityData = {
        type: ActivityType.CONTENT_CREATED,
        severity: ActivitySeverity.INFO,
        userId: adminId,
        description: `Service created: ${service.name}`,
        module: "web-admin",
        action: "create-service",
        metadata: { serviceId: service._id, serviceName: service.name },
      };

      if (session) {
        await ActivityLog.create([activityData], { session });
      } else {
        await ActivityLog.create(activityData);
      }

      logger.info(`Service created: ${service.name}`);
      return service;
    });
  }

  async updateService(
    adminId: mongoose.Types.ObjectId,
    serviceId: string,
    dto: Partial<ServiceDto>
  ): Promise<IService> {
    try {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw AppError.notFound("Service not found");
      }

      // Process main image if provided
      if (dto.image) {
        try {
          const processedImageUrl =
            await this.appwriteService.uploadImageFromUrl(
              dto.image,
              "services",
              `service_main_${serviceId}_${Date.now()}`
            );
          dto.image = processedImageUrl;

          logger.info("Service main image processed and uploaded to Appwrite", {
            serviceId,
            originalUrl: dto.image,
            processedUrl: processedImageUrl,
          });
        } catch (imageError) {
          logger.error("Failed to process service main image", {
            serviceId,
            imageUrl: dto.image,
            error:
              imageError instanceof Error
                ? imageError.message
                : "Unknown error",
          });
          // Continue with original URL if processing fails
        }
      }

      // Process gallery images if provided
      if (dto.gallery && dto.gallery.length > 0) {
        try {
          const processedGalleryUrls: string[] = [];

          for (let i = 0; i < dto.gallery.length; i++) {
            const galleryImageUrl = dto.gallery[i];
            try {
              const processedUrl =
                await this.appwriteService.uploadImageFromUrl(
                  galleryImageUrl,
                  "services",
                  `service_gallery_${serviceId}_${Date.now()}_${i}`
                );
              processedGalleryUrls.push(processedUrl);
            } catch (galleryImageError) {
              logger.error("Failed to process gallery image", {
                serviceId,
                imageUrl: galleryImageUrl,
                index: i,
                error:
                  galleryImageError instanceof Error
                    ? galleryImageError.message
                    : "Unknown error",
              });
              // Use original URL if processing fails
              processedGalleryUrls.push(galleryImageUrl);
            }
          }

          dto.gallery = processedGalleryUrls;

          logger.info(
            "Service gallery images processed and uploaded to Appwrite",
            {
              serviceId,
              originalCount: dto.gallery.length,
              processedCount: processedGalleryUrls.length,
            }
          );
        } catch (galleryError) {
          logger.error("Failed to process service gallery images", {
            serviceId,
            error:
              galleryError instanceof Error
                ? galleryError.message
                : "Unknown error",
          });
          // Continue with original URLs if processing fails
        }
      }

      Object.assign(service, dto);
      service.lastModifiedBy = adminId;
      await service.save();

      logger.info(`Service updated: ${service.name}`);
      return service;
    } catch (error) {
      throw error;
    }
  }

  async deleteService(
    adminId: mongoose.Types.ObjectId,
    serviceId: string
  ): Promise<void> {
    try {
      const service = await Service.findById(serviceId);
      if (!service) {
        throw AppError.notFound("Service not found");
      }

      await service.deleteOne();

      logger.info(`Service deleted: ${service.name}`);
    } catch (error) {
      throw error;
    }
  }

  async getServices(filters?: any, pagination?: PaginationOptions) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "displayOrder";
    const sortOrder = pagination?.sortOrder || "asc";

    const query: any = {};

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      services,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =============== PROJECTS MANAGEMENT ===============

  async createProject(
    adminId: mongoose.Types.ObjectId,
    dto: ProjectDto
  ): Promise<IProject> {
    return await this.executeWithOptionalTransaction(async (session) => {
      const project = new Project({
        ...dto,
        createdBy: adminId,
      });

      await project.save(session ? { session } : {});

      // Log activity
      const activityData = {
        type: ActivityType.CONTENT_CREATED,
        severity: ActivitySeverity.INFO,
        userId: adminId,
        description: `Project created: ${project.title}`,
        module: "web-admin",
        action: "create-project",
        metadata: { projectId: project._id, projectTitle: project.title },
      };

      if (session) {
        await ActivityLog.create([activityData], { session });
      } else {
        await ActivityLog.create(activityData);
      }

      logger.info(`Project created: ${project.title}`);
      return project;
    });
  }

  async updateProject(
    adminId: mongoose.Types.ObjectId,
    projectId: string,
    dto: Partial<ProjectDto>
  ): Promise<IProject> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw AppError.notFound("Project not found");
      }

      // Handle main image processing if provided
      if (dto.mainImageUrl) {
        try {
          const processedImageUrl =
            await this.appwriteService.uploadImageFromUrl(
              dto.mainImageUrl,
              "projects",
              `project_main_${projectId}_${Date.now()}`
            );
          dto.mainImageUrl = processedImageUrl;

          logger.info("Project main image processed and uploaded to Appwrite", {
            projectId,
            originalUrl: dto.mainImageUrl,
            processedUrl: processedImageUrl,
          });
        } catch (imageError) {
          logger.error("Failed to process project main image", {
            projectId,
            imageUrl: dto.mainImageUrl,
            error:
              imageError instanceof Error
                ? imageError.message
                : "Unknown error",
          });
          logger.warn(
            "Continuing with original main image URL due to processing failure"
          );
        }
      }

      // Handle gallery images processing if provided
      if (dto.galleryImages && Array.isArray(dto.galleryImages)) {
        try {
          const processedGalleryImages = await Promise.allSettled(
            dto.galleryImages.map(async (imageUrl, index) => {
              return await this.appwriteService.uploadImageFromUrl(
                imageUrl,
                "projects",
                `project_gallery_${projectId}_${index}_${Date.now()}`
              );
            })
          );

          dto.galleryImages = processedGalleryImages.map((result, index) => {
            if (result.status === "fulfilled") {
              return result.value;
            } else {
              logger.error("Failed to process gallery image", {
                projectId,
                imageIndex: index,
                originalUrl: dto.galleryImages![index],
                error: result.reason,
              });
              return dto.galleryImages![index]; // Keep original URL if processing fails
            }
          });

          logger.info("Project gallery images processed", {
            projectId,
            totalImages: dto.galleryImages.length,
          });
        } catch (galleryError) {
          logger.error("Failed to process project gallery images", {
            projectId,
            error:
              galleryError instanceof Error
                ? galleryError.message
                : "Unknown error",
          });
          logger.warn(
            "Continuing with original gallery image URLs due to processing failure"
          );
        }
      }

      Object.assign(project, dto);
      project.lastModifiedBy = adminId;
      await project.save();

      logger.info(`Project updated: ${project.title}`);
      return project;
    } catch (error) {
      throw error;
    }
  }

  async deleteProject(
    adminId: mongoose.Types.ObjectId,
    projectId: string
  ): Promise<void> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw AppError.notFound("Project not found");
      }

      await project.deleteOne();

      logger.info(`Project deleted: ${project.title}`);
    } catch (error) {
      throw error;
    }
  }

  async getProjects(filters?: any, pagination?: PaginationOptions) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "createdAt";
    const sortOrder = pagination?.sortOrder || "desc";

    const query: any = {};

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    if (filters?.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate("createdBy", "firstName lastName email")
      .populate("relatedServices", "name slug")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      projects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =============== STAFF MANAGEMENT ===============

  async createStaff(
    adminId: mongoose.Types.ObjectId,
    dto: StaffDto
  ): Promise<IStaff> {
    return await this.executeWithOptionalTransaction(async (session) => {
      const existingStaff = await Staff.findOne({ email: dto.email });
      if (existingStaff) {
        throw AppError.conflict("Staff member with this email already exists");
      }

      const staff = new Staff({
        ...dto,
        createdBy: adminId,
      });

      await staff.save(session ? { session } : {});

      // Log activity
      const activityData = {
        type: ActivityType.CONTENT_CREATED,
        severity: ActivitySeverity.INFO,
        userId: adminId,
        description: `Staff member created: ${staff.displayName}`,
        module: "web-admin",
        action: "create-staff",
        metadata: { staffId: staff._id, staffName: staff.displayName },
      };

      if (session) {
        await ActivityLog.create([activityData], { session });
      } else {
        await ActivityLog.create(activityData);
      }

      logger.info(`Staff member created: ${staff.displayName}`);
      return staff;
    });
  }

  async updateStaff(
    adminId: mongoose.Types.ObjectId,
    staffId: string,
    dto: Partial<StaffDto>
  ): Promise<IStaff> {
    try {
      const staff = await Staff.findById(staffId);
      if (!staff) {
        throw AppError.notFound("Staff member not found");
      }

      // Handle image processing if image URL is provided
      if (dto.imageUrl) {
        try {
          // If it's an external URL, upload it to Appwrite
          const processedImageUrl =
            await this.appwriteService.uploadImageFromUrl(
              dto.imageUrl,
              "staff",
              `staff_${staffId}_${Date.now()}`
            );
          dto.imageUrl = processedImageUrl;

          logger.info("Staff image processed and uploaded to Appwrite", {
            staffId,
            originalUrl: dto.imageUrl,
            processedUrl: processedImageUrl,
          });
        } catch (imageError) {
          logger.error("Failed to process staff image", {
            staffId,
            imageUrl: dto.imageUrl,
            error:
              imageError instanceof Error
                ? imageError.message
                : "Unknown error",
          });
          // Continue with the original URL if processing fails
          logger.warn(
            "Continuing with original image URL due to processing failure"
          );
        }
      }

      Object.assign(staff, dto);
      staff.lastModifiedBy = adminId;
      await staff.save();

      logger.info(`Staff member updated: ${staff.displayName}`);
      return staff;
    } catch (error) {
      throw error;
    }
  }

  async deleteStaff(
    adminId: mongoose.Types.ObjectId,
    staffId: string
  ): Promise<void> {
    try {
      const staff = await Staff.findById(staffId);
      if (!staff) {
        throw AppError.notFound("Staff member not found");
      }

      await staff.deleteOne();

      logger.info(`Staff member deleted: ${staff.displayName}`);
    } catch (error) {
      throw error;
    }
  }

  async getStaff(filters?: any, pagination?: PaginationOptions) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "displayOrder";
    const sortOrder = pagination?.sortOrder || "asc";

    const query: any = {};

    if (filters?.department) {
      query.department = filters.department;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isTeamLead !== undefined) {
      query.isTeamLead = filters.isTeamLead;
    }

    if (filters?.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    const total = await Staff.countDocuments(query);
    const staff = await Staff.find(query)
      .populate("userId", "email")
      .populate("createdBy", "firstName lastName email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      staff,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =============== TESTIMONIALS MANAGEMENT ===============

  async createTestimonial(
    adminId: mongoose.Types.ObjectId,
    dto: TestimonialDto
  ): Promise<ITestimonial> {
    return await this.executeWithOptionalTransaction(async (session) => {
      const testimonial = new Testimonial({
        ...dto,
        createdBy: adminId,
      });

      await testimonial.save(session ? { session } : {});

      // Log activity
      const activityData = {
        type: ActivityType.CONTENT_CREATED,
        severity: ActivitySeverity.INFO,
        userId: adminId,
        description: `Testimonial created from ${testimonial.author.name}`,
        module: "web-admin",
        action: "create-testimonial",
        metadata: {
          testimonialId: testimonial._id,
          author: testimonial.author.name,
        },
      };

      if (session) {
        await ActivityLog.create([activityData], { session });
      } else {
        await ActivityLog.create(activityData);
      }

      logger.info(`Testimonial created from ${testimonial.author.name}`);
      return testimonial;
    });
  }

  async approveTestimonial(
    adminId: mongoose.Types.ObjectId,
    testimonialId: string
  ): Promise<ITestimonial> {
    try {
      const testimonial = await Testimonial.findById(testimonialId);
      if (!testimonial) {
        throw AppError.notFound("Testimonial not found");
      }

      await testimonial.approve(adminId);

      logger.info(`Testimonial approved: ${testimonial._id}`);
      return testimonial;
    } catch (error) {
      throw error;
    }
  }

  async rejectTestimonial(
    adminId: mongoose.Types.ObjectId,
    testimonialId: string,
    reason: string
  ): Promise<ITestimonial> {
    try {
      const testimonial = await Testimonial.findById(testimonialId);
      if (!testimonial) {
        throw AppError.notFound("Testimonial not found");
      }

      await testimonial.reject(reason, adminId);

      logger.info(`Testimonial rejected: ${testimonial._id}`);
      return testimonial;
    } catch (error) {
      throw error;
    }
  }

  async getTestimonials(filters?: any, pagination?: PaginationOptions) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "createdAt";
    const sortOrder = pagination?.sortOrder || "desc";

    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.rating) {
      query.rating = filters.rating;
    }

    if (filters?.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }

    if (filters?.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    const total = await Testimonial.countDocuments(query);
    const testimonials = await Testimonial.find(query)
      .populate("project", "title")
      .populate("service", "name")
      .populate("approvedBy", "firstName lastName")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      testimonials,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =============== LANDING SLIDES MANAGEMENT ===============

  async createSlide(
    adminId: mongoose.Types.ObjectId,
    dto: SlideDto
  ): Promise<ILandingSlide> {
    return await this.executeWithOptionalTransaction(async (session) => {
      const slide = new LandingSlide({
        ...dto,
        createdBy: adminId,
      });

      await slide.save(session ? { session } : {});

      // Log activity
      const activityData = {
        type: ActivityType.CONTENT_CREATED,
        severity: ActivitySeverity.INFO,
        userId: adminId,
        description: `Landing slide created: ${slide.title || "Untitled"}`,
        module: "web-admin",
        action: "create-slide",
        metadata: { slideId: slide._id, slideTitle: slide.title || "Untitled" },
      };

      if (session) {
        await ActivityLog.create([activityData], { session });
      } else {
        await ActivityLog.create(activityData);
      }

      logger.info(`Landing slide created: ${slide.title || "Untitled"}`);
      return slide;
    });
  }

  async updateSlide(
    adminId: mongoose.Types.ObjectId,
    slideId: string,
    dto: Partial<SlideDto>
  ): Promise<ILandingSlide> {
    try {
      const slide = await LandingSlide.findById(slideId);
      if (!slide) {
        throw AppError.notFound("Slide not found");
      }

      // Handle image processing if image URL is provided
      if (dto.imageUrl) {
        try {
          // If it's an external URL, upload it to Appwrite
          const processedImageUrl =
            await this.appwriteService.uploadImageFromUrl(
              dto.imageUrl,
              "landing-slides",
              `slide_${slideId}_${Date.now()}`
            );
          dto.imageUrl = processedImageUrl;

          logger.info("Slide image processed and uploaded to Appwrite", {
            slideId,
            originalUrl: dto.imageUrl,
            processedUrl: processedImageUrl,
          });
        } catch (imageError) {
          logger.error("Failed to process slide image", {
            slideId,
            imageUrl: dto.imageUrl,
            error:
              imageError instanceof Error
                ? imageError.message
                : "Unknown error",
          });
          // Continue with the original URL if processing fails
          logger.warn(
            "Continuing with original image URL due to processing failure"
          );
        }
      }

      Object.assign(slide, dto);
      await slide.save();

      logger.info(`Landing slide updated: ${slide.title || "Untitled"}`);
      return slide;
    } catch (error) {
      throw error;
    }
  }

  async deleteSlide(
    adminId: mongoose.Types.ObjectId,
    slideId: string
  ): Promise<void> {
    try {
      const slide = await LandingSlide.findById(slideId);
      if (!slide) {
        throw AppError.notFound("Slide not found");
      }

      await slide.deleteOne();

      logger.info(`Landing slide deleted: ${slide.title || "Untitled"}`);
    } catch (error) {
      throw error;
    }
  }

  async getSlides(filters?: any, pagination?: PaginationOptions) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const sortBy = pagination?.sortBy || "displayOrder";
    const sortOrder = pagination?.sortOrder || "asc";

    const query: any = {};

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const total = await LandingSlide.countDocuments(query);
    const slides = await LandingSlide.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return {
      slides,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reorderSlides(
    adminId: mongoose.Types.ObjectId,
    slideOrders: { id: string; order: number }[]
  ): Promise<void> {
    return await this.executeWithOptionalTransaction(async (session) => {
      for (const item of slideOrders) {
        await LandingSlide.findByIdAndUpdate(
          item.id,
          {
            displayOrder: item.order,
          },
          session ? { session } : {}
        );
      }

      logger.info("Slides reordered successfully");
    });
  }

  // =============== DASHBOARD STATS ===============

  async getDashboardStats(): Promise<any> {
    const [
      totalServices,
      activeServices,
      totalProjects,
      completedProjects,
      totalStaff,
      activeStaff,
      totalTestimonials,
      approvedTestimonials,
      totalSlides,
      activeSlides,
      averageRating,
    ] = await Promise.all([
      Service.countDocuments(),
      Service.countDocuments({ status: "active" }),
      Project.countDocuments(),
      Project.countDocuments({ status: "completed" }),
      Staff.countDocuments(),
      Staff.countDocuments({ status: "active" }),
      Testimonial.countDocuments(),
      Testimonial.countDocuments({ status: "approved" }),
      LandingSlide.countDocuments(),
      LandingSlide.countDocuments({ status: "active" }),
      Testimonial.getAverageRating(),
    ]);

    return {
      services: {
        total: totalServices,
        active: activeServices,
      },
      projects: {
        total: totalProjects,
        completed: completedProjects,
      },
      staff: {
        total: totalStaff,
        active: activeStaff,
      },
      testimonials: {
        total: totalTestimonials,
        approved: approvedTestimonials,
        averageRating: averageRating.averageRating,
      },
      slides: {
        total: totalSlides,
        active: activeSlides,
      },
    };
  }

  // =============== CONTACT MESSAGES METHODS ===============

  async getContactMessages(
    filters: { status?: string; priority?: string },
    options: PaginationOptions
  ) {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;

    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    const total = await ContactMessage.countDocuments(query);
    const messages = await ContactMessage.find(query)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("repliedBy", "firstName lastName email");

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContactMessageById(messageId: string) {
    const message = await ContactMessage.findById(messageId).populate(
      "repliedBy",
      "firstName lastName email"
    );

    if (!message) {
      throw AppError.notFound("Contact message not found");
    }

    // Mark as read if it's new
    if (message.status === "new") {
      await message.markAsRead();
    }

    return message;
  }

  async updateContactMessageStatus(
    messageId: string,
    status: string,
    adminId: mongoose.Types.ObjectId
  ) {
    const message = await ContactMessage.findById(messageId);

    if (!message) {
      throw AppError.notFound("Contact message not found");
    }

    message.status = status as any;

    if (status === "replied") {
      await message.markAsReplied(adminId);
    } else {
      await message.save();
    }

    // Log activity
    await ActivityLog.create({
      user: adminId,
      type: ActivityType.USER_UPDATED,
      action: "UPDATE_CONTACT_STATUS",
      severity: ActivitySeverity.INFO,
      description: `Updated contact message status to ${status}`,
      ipAddress: "",
      metadata: {
        messageId: message._id,
        status,
      },
    });

    return message;
  }

  async updateContactMessageNotes(messageId: string, adminNotes: string) {
    const message = await ContactMessage.findById(messageId);

    if (!message) {
      throw AppError.notFound("Contact message not found");
    }

    message.adminNotes = adminNotes;
    await message.save();

    return message;
  }

  async deleteContactMessage(messageId: string) {
    const message = await ContactMessage.findById(messageId);

    if (!message) {
      throw AppError.notFound("Contact message not found");
    }

    await message.deleteOne();

    return true;
  }

  // =============== CUSTOMER EMAIL MARKETING METHODS ===============

  async getCustomerEmails(filters: { source?: string; search?: string }) {
    const emails: {
      email: string;
      name: string;
      source: string;
      lastContact?: Date;
    }[] = [];

    const emailSet = new Set<string>(); // To avoid duplicates

    // Get emails from contact messages
    if (!filters.source || filters.source === "contact") {
      const contactMessages = await ContactMessage.find({
        email: filters.search
          ? { $regex: filters.search, $options: "i" }
          : { $exists: true },
      })
        .select("email name createdAt")
        .sort({ createdAt: -1 });

      contactMessages.forEach((msg) => {
        if (!emailSet.has(msg.email)) {
          emailSet.add(msg.email);
          emails.push({
            email: msg.email,
            name: msg.name,
            source: "contact",
            lastContact: msg.createdAt,
          });
        }
      });
    }

    // Get emails from testimonials
    if (!filters.source || filters.source === "testimonial") {
      const testimonials = await Testimonial.find({
        "author.email": filters.search
          ? { $regex: filters.search, $options: "i" }
          : { $exists: true },
        status: "approved",
      })
        .select("author createdAt")
        .sort({ createdAt: -1 });

      testimonials.forEach((test) => {
        if (test.author?.email && !emailSet.has(test.author.email)) {
          emailSet.add(test.author.email);
          emails.push({
            email: test.author.email,
            name: test.author.name,
            source: "testimonial",
            lastContact: test.createdAt,
          });
        }
      });
    }

    // Get emails from orders/customers
    if (!filters.source || filters.source === "order") {
      const customers = await Customer.find({
        email: filters.search
          ? { $regex: filters.search, $options: "i" }
          : { $exists: true },
      })
        .select("email firstName lastName updatedAt")
        .sort({ updatedAt: -1 });

      customers.forEach((customer) => {
        if (!emailSet.has(customer.email)) {
          emailSet.add(customer.email);
          emails.push({
            email: customer.email,
            name: `${customer.firstName} ${customer.lastName}`,
            source: "order",
            lastContact: customer.updatedAt,
          });
        }
      });
    }

    // Sort by last contact date
    emails.sort((a, b) => {
      const dateA = a.lastContact ? new Date(a.lastContact).getTime() : 0;
      const dateB = b.lastContact ? new Date(b.lastContact).getTime() : 0;
      return dateB - dateA;
    });

    return {
      emails,
      totalCount: emails.length,
      sources: {
        contact: emails.filter((e) => e.source === "contact").length,
        testimonial: emails.filter((e) => e.source === "testimonial").length,
        order: emails.filter((e) => e.source === "order").length,
      },
    };
  }

  async sendEmailToCustomers(
    data: {
      subject: string;
      message: string;
      recipients?: { email: string; name?: string }[];
      sendToAll?: boolean;
    },
    adminId: mongoose.Types.ObjectId
  ) {
    const emailUtil = new EmailUtil();

    // Determine recipients
    let recipients = data.recipients || [];

    if (data.sendToAll) {
      // Get all customer emails
      const allEmails = await this.getCustomerEmails({});
      recipients = allEmails.emails.map((e) => ({
        email: e.email,
        name: e.name,
      }));
    }

    // Create campaign record
    const campaign = await EmailCampaign.create({
      subject: data.subject,
      message: data.message,
      recipients: recipients.map((r) => ({
        email: r.email,
        name: r.name,
        source: "contact", // Default source
      })),
      recipientCount: recipients.length,
      status: CampaignStatus.SENDING,
      sentBy: adminId,
    });

    // Send emails in background
    this.sendEmailsInBackground(campaign._id.toString(), recipients, data, emailUtil);

    return campaign;
  }

  private async sendEmailsInBackground(
    campaignId: string,
    recipients: { email: string; name?: string }[],
    data: { subject: string; message: string },
    emailUtil: EmailUtil
  ) {
    try {
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          const personalizedMessage = data.message.replace(
            /\{name\}/g,
            recipient.name || "Valued Customer"
          );

          await emailUtil.sendEmail({
            to: recipient.email,
            subject: data.subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                  <h2 style="margin: 0;">${data.subject}</h2>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <div style="background: white; padding: 20px; border-radius: 8px;">
                    ${personalizedMessage.replace(/\n/g, "<br>")}
                  </div>
                </div>
                <div style="background: #333; color: #999; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} Energy Solutions. All rights reserved.</p>
                </div>
              </div>
            `,
            text: personalizedMessage,
          });

          successCount++;
        } catch (error: any) {
          failureCount++;
          errors.push(`${recipient.email}: ${error.message}`);
        }
      }

      // Update campaign status
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        status:
          failureCount === 0 ? CampaignStatus.SENT : CampaignStatus.FAILED,
        successCount,
        failureCount,
        emailErrors: errors.length > 0 ? errors : undefined,
        sentAt: new Date(),
      });

      logger.info(
        `Email campaign ${campaignId} completed: ${successCount} sent, ${failureCount} failed`
      );
    } catch (error: any) {
      logger.error(`Email campaign ${campaignId} failed:`, error);
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        status: CampaignStatus.FAILED,
        emailErrors: [error.message],
      });
    }
  }

  async getEmailCampaigns(filters: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    const campaigns = await EmailCampaign.find(query)
      .populate("sentBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit);

    const total = await EmailCampaign.countDocuments(query);

    return {
      campaigns,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }
}
