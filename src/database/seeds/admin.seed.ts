import { appConfig } from "@config/app.config";
import { DatabaseConnection } from "@config/database.config";
import { UserRole } from "@core/constants/roles.constants";
import { UserStatus } from "@core/constants/status.constants";
import { User } from "@modules/auth/models/user.model";
import { logger } from "@shared/utils/logger.util";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

interface AdminSeedData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
}

const admins: AdminSeedData[] = [
  {
    email: appConfig.systemAdmin.email || "admin@energysolutions.mw",
    password: appConfig.systemAdmin.password || "Admin@123456",
    firstName: appConfig.systemAdmin.firstName || "System",
    lastName: appConfig.systemAdmin.lastName || "Administrator",
    role: UserRole.SYSTEM_ADMIN,
    phoneNumber: "+265999000001",
  },
  {
    email: "sales@energysolutions.mw",
    password: "Sales@123456",
    firstName: "Sales",
    lastName: "Administrator",
    role: UserRole.SALES_ADMIN,
    phoneNumber: "+265999000002",
  },
  {
    email: "web@energysolutions.mw",
    password: "Web@123456",
    firstName: "Web",
    lastName: "Administrator",
    role: UserRole.WEB_ADMIN,
    phoneNumber: "+265999000003",
  },
  {
    email: "support@energysolutions.mw",
    password: "Support@123456",
    firstName: "Support",
    lastName: "Team",
    role: UserRole.HELPDESK,
    phoneNumber: "+265999000004",
  },
];

async function seedAdmins(): Promise<void> {
  try {
    // Connect to database
    const db = DatabaseConnection.getInstance();
    await db.connect();

    logger.info("Starting admin seed process...");

    for (const adminData of admins) {
      try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });

        if (existingAdmin) {
          logger.info(
            `Admin with email ${adminData.email} already exists. Skipping...`
          );
          continue;
        }

        // Create new admin
        const admin = new User({
          ...adminData,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          metadata: {
            loginCount: 0,
            lastLogin: null,
          },
        });

        await admin.save();

        logger.info(`✅ Created ${adminData.role}: ${adminData.email}`);

        // Log credentials for development
        if (appConfig.isDevelopment()) {
          console.log(`
            ====================================
            ${adminData.role} Created:
            Email: ${adminData.email}
            Password: ${adminData.password}
            ====================================
          `);
        }
      } catch (error) {
        logger.error(`Failed to create admin ${adminData.email}:`, error);
      }
    }

    logger.info("Admin seed process completed!");

    // Display summary
    const adminCount = await User.countDocuments({
      role: { $ne: UserRole.CUSTOMER },
    });
    logger.info(`Total admins in database: ${adminCount}`);
  } catch (error) {
    logger.error("Admin seed failed:", error);
    throw error;
  }
}

async function removeSeedAdmins(): Promise<void> {
  try {
    const db = DatabaseConnection.getInstance();
    await db.connect();

    logger.warn("Removing seeded admins...");

    const emails = admins.map((admin) => admin.email);
    const result = await User.deleteMany({ email: { $in: emails } });

    logger.info(`Removed ${result.deletedCount} admin accounts`);
  } catch (error) {
    logger.error("Failed to remove seed admins:", error);
    throw error;
  }
}

// Run the seed
if (require.main === module) {
  const command = process.argv[2];

  if (command === "remove") {
    removeSeedAdmins()
      .then(() => {
        logger.info("Seed removal completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Seed removal failed:", error);
        process.exit(1);
      });
  } else {
    seedAdmins()
      .then(() => {
        logger.info("Seed completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Seed failed:", error);
        process.exit(1);
      });
  }
}

export { removeSeedAdmins, seedAdmins };
