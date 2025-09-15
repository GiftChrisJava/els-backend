import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISessionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  refreshExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isExpired(): boolean;
  isRefreshExpired(): boolean;
  updateActivity(): Promise<void>;
  invalidateSession(): Promise<void>;
}

export interface ISession extends ISessionDocument {}

export interface ISessionMethods {
  isExpired(): boolean;
  isRefreshExpired(): boolean;
  updateActivity(): Promise<void>;
  invalidateSession(): Promise<void>;
}

interface ISessionStatics {
  createSession(
    userId: mongoose.Types.ObjectId,
    token: string,
    refreshToken: string,
    metadata?: any
  ): Promise<ISession>;
  findActiveSession(token: string): Promise<ISession | null>;
  invalidateUserSessions(
    userId: mongoose.Types.ObjectId,
    exceptSessionId?: mongoose.Types.ObjectId
  ): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
}

type SessionModel = Model<ISession, {}, ISessionMethods> & ISessionStatics;

const sessionSchema = new Schema<ISession, SessionModel, ISessionMethods>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    deviceInfo: {
      type: String,
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      },
    },
    refreshExpiresAt: {
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      },
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  }
);

// Compound indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1, isActive: 1 });

// TTL index to automatically delete expired sessions after 30 days
sessionSchema.index(
  { refreshExpiresAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

// Instance methods
sessionSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

sessionSchema.methods.isRefreshExpired = function (): boolean {
  return new Date() > this.refreshExpiresAt;
};

sessionSchema.methods.updateActivity = async function (): Promise<void> {
  this.lastActivity = new Date();

  // Extend token expiry on activity
  const now = new Date();
  const newExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  if (newExpiry > this.expiresAt) {
    this.expiresAt = newExpiry;
  }

  await this.save();
};

sessionSchema.methods.invalidateSession = async function (
  this: ISession
): Promise<void> {
  this.isActive = false;
  await this.save();
};

// Static methods
sessionSchema.statics.createSession = async function (
  userId: mongoose.Types.ObjectId,
  token: string,
  refreshToken: string,
  metadata?: any
): Promise<ISession> {
  const sessionData: any = {
    userId,
    token,
    refreshToken,
    isActive: true,
  };

  if (metadata) {
    sessionData.ipAddress = metadata.ipAddress;
    sessionData.userAgent = metadata.userAgent;
    sessionData.deviceInfo = metadata.deviceInfo;
    sessionData.location = metadata.location;
  }

  const session = await this.create(sessionData);
  return session;
};

sessionSchema.statics.findActiveSession = async function (
  token: string
): Promise<ISession | null> {
  const session = await this.findOne({
    token,
    isActive: true,
  });

  if (!session) {
    return null;
  }

  if (session.isExpired()) {
    await session.invalidateSession();
    return null;
  }

  return session;
};

sessionSchema.statics.invalidateUserSessions = async function (
  userId: mongoose.Types.ObjectId,
  exceptSessionId?: mongoose.Types.ObjectId
): Promise<void> {
  const query: any = {
    userId,
    isActive: true,
  };

  if (exceptSessionId) {
    query._id = { $ne: exceptSessionId };
  }

  await this.updateMany(query, { isActive: false });
};

sessionSchema.statics.cleanupExpiredSessions =
  async function (): Promise<number> {
    const result = await this.deleteMany({
      $or: [
        { refreshExpiresAt: { $lt: new Date() } },
        {
          isActive: false,
          updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
        },
      ],
    });

    return result.deletedCount || 0;
  };

export const Session = mongoose.model<ISession, SessionModel>(
  "Session",
  sessionSchema
);
