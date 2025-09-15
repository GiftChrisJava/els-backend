import { IUser } from "@modules/auth/models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      sessionId?: string;
      role?: string;
    }
  }
}

export {};
