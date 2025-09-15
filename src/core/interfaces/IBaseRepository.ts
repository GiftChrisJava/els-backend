import { Document, FilterQuery, QueryOptions, UpdateQuery } from "mongoose";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface IBaseRepository<T extends Document> {
  create(data: Partial<T>): Promise<T>;

  findById(id: string): Promise<T | null>;

  findOne(filter: FilterQuery<T>): Promise<T | null>;

  find(filter: FilterQuery<T>, options?: QueryOptions): Promise<T[]>;

  findWithPagination(
    filter: FilterQuery<T>,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<T>>;

  update(
    id: string,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T | null>;

  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<{ modifiedCount: number }>;

  delete(id: string): Promise<boolean>;

  deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }>;

  count(filter: FilterQuery<T>): Promise<number>;

  exists(filter: FilterQuery<T>): Promise<boolean>;

  aggregate(pipeline: any[]): Promise<any[]>;
}
