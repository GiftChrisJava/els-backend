export enum UserRole {
  SYSTEM_ADMIN = "system-admin",
  SALES_ADMIN = "sales-admin",
  WEB_ADMIN = "web-admin",
  HELPDESK = "helpdesk",
  CUSTOMER = "customer",
}

export const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 5,
  [UserRole.SALES_ADMIN]: 4,
  [UserRole.WEB_ADMIN]: 3,
  [UserRole.HELPDESK]: 2,
  [UserRole.CUSTOMER]: 1,
};

export const ADMIN_ROLES = [
  UserRole.SYSTEM_ADMIN,
  UserRole.SALES_ADMIN,
  UserRole.WEB_ADMIN,
  UserRole.HELPDESK,
];

export const ROLE_PERMISSIONS = {
  [UserRole.SYSTEM_ADMIN]: [
    "manage_all_users",
    "create_admins",
    "delete_admins",
    "view_system_logs",
    "manage_system_settings",
    "access_all_modules",
  ],
  [UserRole.SALES_ADMIN]: [
    "manage_products",
    "manage_orders",
    "view_sales_analytics",
    "manage_inventory",
    "record_offline_sales",
    "manage_customers",
  ],
  [UserRole.WEB_ADMIN]: [
    "manage_services",
    "manage_projects",
    "manage_staff",
    "manage_testimonials",
    "manage_website_content",
    "manage_slides",
  ],
  [UserRole.HELPDESK]: [
    "view_support_tickets",
    "respond_to_inquiries",
    "manage_customer_communications",
    "view_customer_info",
  ],
  [UserRole.CUSTOMER]: [
    "view_products",
    "place_orders",
    "view_own_orders",
    "submit_support_tickets",
    "manage_own_profile",
  ],
};
