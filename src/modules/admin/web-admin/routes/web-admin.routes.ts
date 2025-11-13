import { Router } from "express";
import { UserRole } from "../../../../core/constants/role.constants";
import { authenticate } from "../../../../modules/auth/middlewares/auth.middleware";
import { hasRole } from "../../../../modules/auth/middlewares/role.middleware";
import {
  handleMulterError,
  uploadLandingSlideImage,
  uploadProjectImages,
  uploadServiceImages,
  uploadStaffProfileImage,
  uploadTestimonialFiles,
} from "../../../../shared/middlewares/upload.middleware";
import {
  parseFormDataJSON,
  validateRequest,
} from "../../../../shared/middlewares/validation.middleware";
import { WebAdminController } from "../controller/web-admin.controller";
import * as validators from "../validator/web-admin.validator";

const router = Router();
const webAdminController = new WebAdminController();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get(
  "/dashboard",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getDashboardStats
);

// =============== SERVICES ROUTES ===============

router.get(
  "/services",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getServices
);

router.get(
  "/services/:serviceId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getServiceById
);

// Service creation with file upload
router.post(
  "/services",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadServiceImages,
  handleMulterError,
  webAdminController.createServiceWithFileUpload
);

// Service update with file upload
router.patch(
  "/services/:serviceId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadServiceImages,
  handleMulterError,
  webAdminController.updateServiceWithFileUpload
);

router.delete(
  "/services/:serviceId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deleteService
);

// =============== PROJECTS ROUTES ===============

router.get(
  "/projects",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getProjects
);

router.get(
  "/projects/:projectId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getProjectById
);

router.post(
  "/projects",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadProjectImages,
  webAdminController.createProjectWithFileUpload
);

router.patch(
  "/projects/:projectId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadProjectImages,
  webAdminController.updateProjectWithFileUpload
);

router.delete(
  "/projects/:projectId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deleteProject
);

router.post(
  "/projects/:projectId/publish",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.publishProject
);

// =============== STAFF ROUTES ===============

router.get(
  "/staff",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getStaff
);

router.get(
  "/staff/:staffId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getStaffById
);

router.post(
  "/staff",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadStaffProfileImage,
  webAdminController.createStaffWithFileUpload
);

router.patch(
  "/staff/:staffId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadStaffProfileImage,
  webAdminController.updateStaffWithFileUpload
);

router.delete(
  "/staff/:staffId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deleteStaff
);

// =============== TESTIMONIALS ROUTES ===============

router.get(
  "/testimonials",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getTestimonials
);

router.post(
  "/testimonials",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  validateRequest(validators.createTestimonialSchema),
  webAdminController.createTestimonial
);

router.post(
  "/testimonials/upload",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadTestimonialFiles,
  webAdminController.createTestimonialWithFileUpload
);

router.post(
  "/testimonials/:testimonialId/approve",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.approveTestimonial
);

router.post(
  "/testimonials/:testimonialId/reject",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  validateRequest(validators.rejectTestimonialSchema),
  webAdminController.rejectTestimonial
);

// =============== LANDING SLIDES ROUTES ===============

router.get(
  "/slides",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getSlides
);

router.post(
  "/slides",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  uploadLandingSlideImage,
  parseFormDataJSON(["media"]),
  validateRequest(validators.createSlideSchema),
  webAdminController.createSlide
);

router.patch(
  "/slides/:slideId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  validateRequest(validators.updateSlideSchema),
  webAdminController.updateSlide
);

router.delete(
  "/slides/:slideId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deleteSlide
);

router.post(
  "/slides/reorder",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  validateRequest(validators.reorderSlidesSchema),
  webAdminController.reorderSlides
);

router.post(
  "/slides/:slideId/activate",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.activateSlide
);

router.post(
  "/slides/:slideId/deactivate",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deactivateSlide
);

// =============== CONTACT MESSAGES ROUTES ===============

router.get(
  "/contact-messages",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getContactMessages
);

router.get(
  "/contact-messages/:messageId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getContactMessageById
);

router.patch(
  "/contact-messages/:messageId/status",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.updateContactMessageStatus
);

router.patch(
  "/contact-messages/:messageId/notes",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.updateContactMessageNotes
);

router.delete(
  "/contact-messages/:messageId",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.deleteContactMessage
);

// =============== CUSTOMER EMAIL MARKETING ROUTES ===============

router.get(
  "/customers/emails",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getCustomerEmails
);

router.post(
  "/customers/send-email",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.sendEmailToCustomers
);

router.get(
  "/email-campaigns",
  hasRole(UserRole.WEB_ADMIN, UserRole.SYSTEM_ADMIN),
  webAdminController.getEmailCampaigns
);

// Error handling for multer file upload errors
router.use(handleMulterError);

export default router;
