import { LandingSlide } from "@modules/admin/web-admin/models/landing-slide.model";
import {
  Project,
  ProjectStatus,
} from "@modules/admin/web-admin/models/project.model";
import {
  Service,
  ServiceStatus,
} from "@modules/admin/web-admin/models/service.model";
import {
  Staff,
  StaffStatus,
} from "@modules/admin/web-admin/models/staff.model";
import {
  Testimonial,
  TestimonialStatus,
} from "@modules/admin/web-admin/models/testimonial.model";
import { optionalAuth } from "@modules/auth/middlewares/auth.middleware";
import { AppError } from "@shared/errors/AppError";
import { asyncHandler } from "@shared/utils/async-handler.util";
import { ResponseUtil } from "@shared/utils/response.util";
import { Request, Response, Router } from "express";

const router = Router();

// =============== PUBLIC SERVICES ===============

router.get(
  "/services",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { category, featured, page = 1, limit = 10 } = req.query;

    const query: any = {
      status: ServiceStatus.ACTIVE,
    };

    if (category) {
      query.category = category;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
      .select("-createdBy -lastModifiedBy -metadata")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    ResponseUtil.paginated(
      res,
      services,
      Number(page),
      Number(limit),
      total,
      "Services retrieved successfully"
    );
  })
);

router.get(
  "/services/featured",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const services = await Service.findFeatured()
      .select("-createdBy -lastModifiedBy -metadata")
      .limit(6);

    ResponseUtil.success(
      res,
      { services },
      "Featured services retrieved successfully"
    );
  })
);

router.get(
  "/services/:slug",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const service = await Service.findOne({
      slug,
      status: ServiceStatus.ACTIVE,
    }).select("-createdBy -lastModifiedBy");

    if (!service) {
      throw AppError.notFound("Service not found");
    }

    // Increment views
    await service.incrementViews();

    ResponseUtil.success(res, { service }, "Service retrieved successfully");
  })
);

// =============== PUBLIC PROJECTS ===============

router.get(
  "/projects",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { category, featured, status, page = 1, limit = 10 } = req.query;

    const query: any = {
      isPublished: true,
    };

    if (category) {
      query.category = category;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    if (status) {
      query.status = status;
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .select("-createdBy -lastModifiedBy -projectValue")
      .populate("relatedServices", "name slug")
      .sort({ isFeatured: -1, startDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    ResponseUtil.paginated(
      res,
      projects,
      Number(page),
      Number(limit),
      total,
      "Projects retrieved successfully"
    );
  })
);

router.get(
  "/projects/featured",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get recent projects since we removed the featured functionality
    const projects = await Project.find({ status: "completed" })
      .select("-createdBy -lastModifiedBy -projectValue")
      .populate("relatedServices", "name slug")
      .sort({ createdAt: -1 })
      .limit(6);

    ResponseUtil.success(
      res,
      { projects },
      "Featured projects retrieved successfully"
    );
  })
);

router.get(
  "/projects/:slug",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;

    const project = await Project.findOne({
      slug,
      isPublished: true,
    })
      .select("-createdBy -lastModifiedBy")
      .populate("relatedServices", "name slug category");

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    // Increment views
    await project.incrementViews();

    // Get related projects
    const relatedProjects = await Project.find({
      _id: { $ne: project._id },
      category: project.category,
      isPublished: true,
    })
      .select("title slug client images.featured category")
      .limit(3);

    ResponseUtil.success(
      res,
      {
        project,
        relatedProjects,
      },
      "Project retrieved successfully"
    );
  })
);

// =============== PUBLIC STAFF ===============

router.get(
  "/staff",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { department, featured, page = 1, limit = 12 } = req.query;

    const query: any = {
      status: StaffStatus.ACTIVE,
      isPublished: true,
    };

    if (department) {
      query.department = department;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    const total = await Staff.countDocuments(query);
    const staff = await Staff.find(query)
      .select("-createdBy -lastModifiedBy -userId -employeeId")
      .sort({ isTeamLead: -1, displayOrder: 1, joinedDate: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    ResponseUtil.paginated(
      res,
      staff,
      Number(page),
      Number(limit),
      total,
      "Staff members retrieved successfully"
    );
  })
);

router.get(
  "/staff/team-leads",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const teamLeads = await Staff.findTeamLeads().select(
      "-createdBy -lastModifiedBy -userId -employeeId"
    );

    ResponseUtil.success(
      res,
      { staff: teamLeads },
      "Team leads retrieved successfully"
    );
  })
);

router.get(
  "/staff/:id",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const staff = await Staff.findOne({
      _id: id,
      status: StaffStatus.ACTIVE,
      isPublished: true,
    }).select("-createdBy -lastModifiedBy -userId -employeeId");

    if (!staff) {
      throw AppError.notFound("Staff member not found");
    }

    ResponseUtil.success(res, { staff }, "Staff member retrieved successfully");
  })
);

// =============== PUBLIC TESTIMONIALS ===============

router.get(
  "/testimonials",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { featured, rating, page = 1, limit = 10 } = req.query;

    const query: any = {
      status: TestimonialStatus.APPROVED,
      isPublished: true,
    };

    if (featured === "true") {
      query.isFeatured = true;
    }

    if (rating) {
      query.rating = Number(rating);
    }

    const total = await Testimonial.countDocuments(query);
    const testimonials = await Testimonial.find(query)
      .select(
        "-createdBy -approvedBy -lastModifiedBy -metadata -adminNotes -rejectionReason"
      )
      .populate("project", "title slug")
      .populate("service", "name slug")
      .sort({ isFeatured: -1, rating: -1, publishedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Get average rating
    const stats = await Testimonial.getAverageRating();

    ResponseUtil.paginated(
      res,
      testimonials,
      Number(page),
      Number(limit),
      total,
      "Testimonials retrieved successfully",
      { averageRating: stats.averageRating, totalReviews: stats.totalReviews }
    );
  })
);

router.get(
  "/testimonials/featured",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const testimonials = await Testimonial.findFeatured()
      .select("-createdBy -approvedBy -lastModifiedBy -metadata -adminNotes")
      .populate("project", "title")
      .populate("service", "name")
      .limit(6);

    ResponseUtil.success(
      res,
      { testimonials },
      "Featured testimonials retrieved successfully"
    );
  })
);

// Submit testimonial (public can submit)
router.post(
  "/testimonials/submit",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { content, rating, author, projectId, serviceId } = req.body;

    if (!content || !rating || !author?.name) {
      throw AppError.badRequest(
        "Content, rating, and author name are required"
      );
    }

    const testimonial = new Testimonial({
      content,
      rating,
      author,
      project: projectId,
      service: serviceId,
      status: TestimonialStatus.PENDING,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        referrer: req.get("referrer"),
        submittedAt: new Date(),
      },
      createdBy: req.user?._id,
    });

    await testimonial.save();

    ResponseUtil.created(
      res,
      {
        message:
          "Thank you for your testimonial! It will be reviewed and published soon.",
      },
      "Testimonial submitted successfully"
    );
  })
);

// =============== PUBLIC LANDING SLIDES ===============

router.get(
  "/slides",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { device = "desktop" } = req.query;

    const slides = await LandingSlide.findActive()
      .select("-createdBy")
      .sort("displayOrder");

    // Return all active slides (simplified model doesn't have device visibility)
    ResponseUtil.success(
      res,
      { slides },
      "Landing slides retrieved successfully"
    );
  })
);

// =============== PUBLIC STATISTICS ===============

router.get(
  "/statistics",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const [
      totalProjects,
      completedProjects,
      totalServices,
      totalStaff,
      testimonialStats,
    ] = await Promise.all([
      Project.countDocuments({ isPublished: true }),
      Project.countDocuments({
        isPublished: true,
        status: ProjectStatus.COMPLETED,
      }),
      Service.countDocuments({ status: ServiceStatus.ACTIVE }),
      Staff.countDocuments({ status: StaffStatus.ACTIVE, isPublished: true }),
      Testimonial.getAverageRating(),
    ]);

    const stats = {
      projects: {
        total: totalProjects,
        completed: completedProjects,
      },
      services: totalServices,
      staff: totalStaff,
      testimonials: {
        averageRating: testimonialStats.averageRating,
        totalReviews: testimonialStats.totalReviews,
      },
    };

    ResponseUtil.success(res, stats, "Statistics retrieved successfully");
  })
);

// =============== CONTACT FORM (for helpdesk) ===============

router.post(
  "/contact",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, subject, message, service } = req.body;

    if (!name || !email || !message) {
      throw AppError.badRequest("Name, email, and message are required");
    }

    // This will be handled by helpdesk module in Phase 6
    // For now, we'll just acknowledge receipt

    ResponseUtil.success(
      res,
      {
        message: "Thank you for contacting us. We will get back to you soon!",
      },
      "Contact form submitted successfully"
    );
  })
);

export default router;
