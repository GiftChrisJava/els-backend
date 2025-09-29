import { IUser } from "@modules/auth/models/user.model";
import { File } from "multer";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      sessionId?: string;
      role?: string;
    }
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

export {};
